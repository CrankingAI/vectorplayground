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

# Step 3: Validate Bicep
log_info "Phase 3: Validating Bicep against target subscription..."
"$SCRIPT_DIR/validate-bicep.sh" --subscription "$SUBSCRIPTION"

# Step 4: Bootstrap infra + code
log_info "Phase 4: Running setup-env.sh..."
"$SCRIPT_DIR/setup-env.sh" --subscription "$SUBSCRIPTION" $DRY_RUN

if [[ -n "$DRY_RUN" ]]; then
  log_success "Dry run complete. Re-run without --dry-run to apply."
  exit 0
fi

# Step 5: Refresh GitHub Actions secrets
if $SKIP_SECRETS; then
  log_warn "Skipping GitHub secrets refresh (--skip-secrets)"
else
  log_info "Phase 5: Refreshing GitHub Actions secrets..."
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
