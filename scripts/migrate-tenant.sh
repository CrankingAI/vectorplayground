#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  local exit_code="${1:-0}"
  cat <<EOF
Usage: $(basename "$0") --tenant <tenant-id> --subscription <sub-id-or-name> [options]

Migrate Vector Playground to a different Azure tenant / subscription.

Orchestrates a clean re-deploy into the target tenant:
  1. az login against the target tenant
  2. Select the target subscription
  3. Validate Bicep (what-if) against the target sub
  4. Run setup-env.sh (infra + code) against the target sub
  5. Refresh GitHub Actions secrets for the new Function App / SWA
  6. Print manual follow-ups (DNS, OIDC, custom domain)

Required:
  --tenant         Target Azure AD tenant ID (or domain)
  --subscription   Target Azure subscription ID or name

Options:
  --skip-login     Assume az CLI is already logged into the target tenant
  --skip-secrets   Skip refreshing GitHub Actions secrets
  --dry-run        Preview infra changes without deploying
  --yes            Skip confirmation prompt
  -h, --help       Show this help message

Examples:
  $(basename "$0") \\
    --tenant f19ea096-6a72-400a-b6a4-7a0900ab6e87 \\
    --subscription f906a716-7602-4c74-bb5b-f98fbc385b0c

  $(basename "$0") --tenant effectiveazure.com \\
    --subscription EffAz-Prod --dry-run
EOF
  exit "$exit_code"
}

require_value() {
  # require_value <flag-name> <value>
  if [[ -z "${2:-}" || "${2:0:2}" == "--" ]]; then
    echo "Error: $1 requires a value" >&2
    usage 2
  fi
}

TENANT=""
SUBSCRIPTION=""
SKIP_LOGIN=false
SKIP_SECRETS=false
DRY_RUN=""
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --tenant) require_value "$1" "${2:-}"; TENANT="$2"; shift 2 ;;
    --subscription) require_value "$1" "${2:-}"; SUBSCRIPTION="$2"; shift 2 ;;
    --skip-login) SKIP_LOGIN=true; shift ;;
    --skip-secrets) SKIP_SECRETS=true; shift ;;
    --dry-run) DRY_RUN="--dry-run"; shift ;;
    --yes|-y) ASSUME_YES=true; shift ;;
    *) echo "Unknown option: $1" >&2; usage 2 ;;
  esac
done

log_info()    { echo -e "\033[34m[i]\033[0m $*"; }
log_success() { echo -e "\033[32m[+]\033[0m $*"; }
log_warn()    { echo -e "\033[33m[!]\033[0m $*"; }
log_error()   { echo -e "\033[31m[x]\033[0m $*" >&2; }

if [[ -z "$TENANT" || -z "$SUBSCRIPTION" ]]; then
  log_error "--tenant and --subscription are required"
  usage 2
fi

command -v az >/dev/null 2>&1 || { log_error "Azure CLI (az) is required"; exit 1; }

log_info "Target tenant:       $TENANT"
log_info "Target subscription: $SUBSCRIPTION"
[[ -n "$DRY_RUN" ]] && log_warn "Dry run mode — no resources will be created"

if ! $ASSUME_YES; then
  if [[ ! -t 0 ]]; then
    log_error "Confirmation requires an interactive terminal; re-run with --yes to proceed non-interactively"
    exit 1
  fi
  if ! read -r -p "Proceed with tenant migration? [y/N] " reply; then
    log_error "Failed to read confirmation from stdin; re-run with --yes to proceed non-interactively"
    exit 1
  fi
  [[ "$reply" =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
fi

# Step 1: Login
if $SKIP_LOGIN; then
  log_info "Skipping az login (--skip-login)"
else
  log_info "Phase 1: Logging into tenant $TENANT..."
  az login --tenant "$TENANT" --only-show-errors
fi

# Step 2: Select subscription
log_info "Phase 2: Selecting subscription..."
az account set --subscription "$SUBSCRIPTION"
CURRENT_SUB=$(az account show --query id -o tsv)
CURRENT_TENANT=$(az account show --query tenantId -o tsv)
log_success "Active sub: $CURRENT_SUB (tenant $CURRENT_TENANT)"

# Phase 3: Preflight — verify globally-unique names are free (or already ours)
log_info "Phase 3: Preflight — checking globally-unique names..."

PARAM_FILE="$SCRIPT_DIR/../infra/parameters/prod.bicepparam"
ENV_NAME="prod"
LOCATION="eastus2"
TARGET_RG="rg-vectorplayground"
extract_param() {
  # extract_param <param-name> <file>
  # Prints the quoted value (single or double quotes) or empty on no match.
  sed -nE "s/^[[:space:]]*param[[:space:]]+$1[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p" "$2" | head -1
}
if [[ -f "$PARAM_FILE" ]]; then
  extracted_env=$(extract_param environmentName "$PARAM_FILE" || true)
  extracted_loc=$(extract_param location "$PARAM_FILE" || true)
  [[ "$extracted_env" =~ ^[A-Za-z0-9-]+$ ]] && ENV_NAME="$extracted_env"
  [[ "$extracted_loc" =~ ^[a-z0-9]+$ ]] && LOCATION="$extracted_loc"
fi
STORAGE_NAME="stvectorplayground"
FOUNDRY_NAME="vectorplayground"
FUNC_NAME="func-vectorplayground"
SWA_NAME="stapp-vectorplayground"
log_info "  env=${ENV_NAME} location=${LOCATION} target-rg=${TARGET_RG}"
log_info "  expected storage:            ${STORAGE_NAME}"
log_info "  expected foundry subdomain:  ${FOUNDRY_NAME}"
log_info "  expected function app:       ${FUNC_NAME}"
log_info "  expected static web app:     ${SWA_NAME}"

preflight_failed=false

# ---------------- Storage account ----------------
# If it already exists in the target RG, it's ours (idempotent redeploy).
if az storage account show -n "$STORAGE_NAME" -g "$TARGET_RG" --query id -o tsv >/dev/null 2>&1; then
  log_success "  storage '$STORAGE_NAME' already exists in $TARGET_RG (ours) — redeploy will be idempotent"
else
  storage_check=$(az storage account check-name --name "$STORAGE_NAME" \
    --query "[nameAvailable, message]" -o tsv 2>/dev/null || echo "")
  if [[ -z "$storage_check" ]]; then
    log_error "  could not verify storage name availability"
    preflight_failed=true
  else
    storage_available=$(printf '%s\n' "$storage_check" | head -1)
    storage_reason=$(printf '%s\n' "$storage_check" | sed -n '2p')
    if [[ "$storage_available" == "True" || "$storage_available" == "true" ]]; then
      log_success "  storage name '$STORAGE_NAME' is available"
    else
      log_error "  storage name '$STORAGE_NAME' is NOT available: ${storage_reason:-unknown}"
      log_error "    Fix: find + delete the account holding the name, or rename in infra/storage.bicep"
      preflight_failed=true
    fi
  fi
fi

# ---------------- Function App (globally-unique hostname in azurewebsites.net) ----------------
if az webapp show -n "$FUNC_NAME" -g "$TARGET_RG" --query id -o tsv >/dev/null 2>&1; then
  log_success "  function app '$FUNC_NAME' already exists in $TARGET_RG (ours) — redeploy will be idempotent"
else
  func_check=$(az rest --method post \
    --url "https://management.azure.com/subscriptions/$CURRENT_SUB/providers/Microsoft.Web/checknameavailability?api-version=2023-12-01" \
    --body "{\"name\":\"$FUNC_NAME\",\"type\":\"Microsoft.Web/sites\"}" \
    --query "[nameAvailable, message]" -o tsv 2>/dev/null || echo "")
  if [[ -z "$func_check" ]]; then
    log_error "  could not verify function app name availability"
    preflight_failed=true
  else
    func_available=$(printf '%s\n' "$func_check" | head -1)
    func_reason=$(printf '%s\n' "$func_check" | sed -n '2,$p' | tr '\n' ' ')
    if [[ "$func_available" == "True" || "$func_available" == "true" ]]; then
      log_success "  function app name '$FUNC_NAME' is available"
    else
      log_error "  function app name '$FUNC_NAME' is NOT available: ${func_reason:-unknown}"
      log_error "    Fix: delete the site holding the name (possibly still releasing after RG delete — retry in 10-15m)"
      log_error "    Or rename functionAppName in infra/functionApp.bicep (e.g. drop the -\${environmentName} suffix)"
      preflight_failed=true
    fi
  fi
fi

# ---------------- Static Web App ----------------
# SWA resource names aren't globally-unique the same way (hostname gets a hash suffix),
# but we still check idempotency against the target RG so the log is informative.
if az staticwebapp show -n "$SWA_NAME" -g "$TARGET_RG" --query id -o tsv >/dev/null 2>&1; then
  log_success "  static web app '$SWA_NAME' already exists in $TARGET_RG (ours) — redeploy will be idempotent"
else
  log_info "  static web app '$SWA_NAME' will be created fresh"
fi

# ---------------- Foundry (Cognitive Services) custom subdomain ----------------
# Globally unique; survives soft-delete for 48h.
existing_foundry=$(az cognitiveservices account show -n "$FOUNDRY_NAME" -g "$TARGET_RG" \
  --query "properties.customSubDomainName" -o tsv 2>/dev/null || echo "")
if [[ "$existing_foundry" == "$FOUNDRY_NAME" ]]; then
  log_success "  foundry '$FOUNDRY_NAME' already exists in $TARGET_RG (ours) — redeploy will be idempotent"
else
  soft_deleted_name=$(az cognitiveservices account list-deleted \
    --query "[?name=='$FOUNDRY_NAME'] | [0].name" -o tsv 2>/dev/null || echo "")
  if [[ -n "$soft_deleted_name" && "$soft_deleted_name" != "None" ]]; then
    sd_loc=$(az cognitiveservices account list-deleted \
      --query "[?name=='$FOUNDRY_NAME'] | [0].location" -o tsv 2>/dev/null || echo "")
    sd_rg=$(az cognitiveservices account list-deleted \
      --query "[?name=='$FOUNDRY_NAME'] | [0].resourceGroup" -o tsv 2>/dev/null || echo "")
    log_error "  foundry subdomain '$FOUNDRY_NAME' is held by a SOFT-DELETED account"
    log_error "    Fix: az cognitiveservices account purge --name '$FOUNDRY_NAME' --location '${sd_loc:-$LOCATION}' --resource-group '${sd_rg:-$TARGET_RG}'"
    preflight_failed=true
  else
    if domain_available=$(az rest --method post \
      --url "https://management.azure.com/subscriptions/$CURRENT_SUB/providers/Microsoft.CognitiveServices/checkDomainAvailability?api-version=2023-05-01" \
      --body "{\"subdomainName\":\"$FOUNDRY_NAME\",\"type\":\"Microsoft.CognitiveServices/accounts\"}" \
      --query isSubdomainAvailable -o tsv 2>/dev/null); then
      if [[ "$domain_available" == "true" ]]; then
        log_success "  foundry subdomain '$FOUNDRY_NAME' is available"
      elif [[ -z "$domain_available" ]]; then
        log_error "  could not verify foundry subdomain availability (empty response)"
        preflight_failed=true
      else
        log_error "  foundry subdomain '$FOUNDRY_NAME' is NOT available (in active use elsewhere)"
        log_error "    Diagnose: az cognitiveservices account list --query \"[?properties.customSubDomainName=='$FOUNDRY_NAME']\" -o table"
        log_error "    Then across all accessible subs:"
        log_error "      for s in \$(az account list --query '[].id' -o tsv); do az account set -s \"\$s\"; az cognitiveservices account list --query \"[?properties.customSubDomainName=='$FOUNDRY_NAME'].{sub:'\$s',name:name,rg:resourceGroup}\" -o tsv; done"
        log_error "    Fix: delete the holder, then purge if needed, or rename accountName in infra/foundry.bicep"
        preflight_failed=true
      fi
    else
      log_error "  failed to check foundry subdomain availability"
      preflight_failed=true
    fi
  fi
fi

if $preflight_failed; then
  log_error "Preflight failed. See fixes above, then re-run."
  exit 1
fi
log_success "Preflight passed"

# Phase 4: Validate Bicep
log_info "Phase 4: Validating Bicep against target subscription..."
"$SCRIPT_DIR/validate-bicep.sh" --subscription "$SUBSCRIPTION"

# Phase 5: Bootstrap infra + code
log_info "Phase 5: Running setup-env.sh..."
"$SCRIPT_DIR/setup-env.sh" --subscription "$SUBSCRIPTION" $DRY_RUN

if [[ -n "$DRY_RUN" ]]; then
  log_success "Dry run complete. Re-run without --dry-run to apply."
  exit 0
fi

# Phase 6: Refresh GitHub Actions secrets
if $SKIP_SECRETS; then
  log_warn "Skipping GitHub secrets refresh (--skip-secrets)"
else
  log_info "Phase 6: Refreshing GitHub Actions secrets..."
  "$SCRIPT_DIR/get-gh-secrets.sh" --subscription "$SUBSCRIPTION" --set
fi

log_success "Tenant migration complete"
cat <<EOF

Manual follow-ups (not handled by this script):
  1. DNS: re-point vectorplayground.com + www CNAMEs at the new SWA hostname
  2. SWA custom domain: validate + bind vectorplayground.com in the new SWA
  3. GitHub OIDC: if workflows use federated credentials, create a new
     app registration / federated credential in tenant $TENANT and update
     AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_SUBSCRIPTION_ID repo secrets
  4. Decommission old resources in the previous tenant once cutover is verified
  5. Update hard-coded subscription defaults in deploy.sh / view-stats.sh if
     the new subscription should become the default
EOF
