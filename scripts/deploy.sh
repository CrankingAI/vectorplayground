#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Deploy Vector Playground infrastructure and code to Azure.

Options:
  --infra-only    Deploy only Bicep infrastructure (skip code)
  --code-only     Deploy only application code (skip infra)
  --dry-run       Show what would be deployed without making changes
  --subscription  Azure subscription ID or name (default: 379168a0-b9fc-4fa0-a3cd-ce32ab20ee70)
  -h, --help      Show this help message

Examples:
  $(basename "$0")                    # Full deploy (infra + code)
  $(basename "$0") --infra-only       # Infrastructure only
  $(basename "$0") --code-only        # Code only
  $(basename "$0") --dry-run          # Preview changes
EOF
  exit 0
}

# Parse arguments
INFRA_ONLY=false
CODE_ONLY=false
DRY_RUN=false
SUBSCRIPTION="379168a0-b9fc-4fa0-a3cd-ce32ab20ee70"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --infra-only) INFRA_ONLY=true; shift ;;
    --code-only) CODE_ONLY=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# Logging helpers
log_info()    { echo -e "\033[34m[i]\033[0m $*"; }
log_success() { echo -e "\033[32m[+]\033[0m $*"; }
log_warn()    { echo -e "\033[33m[!]\033[0m $*"; }
log_error()   { echo -e "\033[31m[x]\033[0m $*"; }

format_duration() {
  local seconds=$1
  local h=$((seconds / 3600))
  local m=$(( (seconds % 3600) / 60 ))
  local s=$((seconds % 60))
  if [[ $h -gt 0 ]]; then
    printf "%dh %02dm %02ds" "$h" "$m" "$s"
  elif [[ $m -gt 0 ]]; then
    printf "%dm %02ds" "$m" "$s"
  else
    printf "%ds" "$s"
  fi
}

# Preflight checks
command -v az >/dev/null 2>&1 || { log_error "Azure CLI (az) is required"; exit 1; }

if [[ "$INFRA_ONLY" != "true" ]]; then
  command -v dotnet >/dev/null 2>&1 || { log_error ".NET SDK is required"; exit 1; }
  command -v npm >/dev/null 2>&1 || { log_error "npm is required"; exit 1; }
  command -v npx >/dev/null 2>&1 || { log_error "npx is required"; exit 1; }
  command -v zip >/dev/null 2>&1 || { log_error "zip is required"; exit 1; }
fi

START_TIME=$SECONDS

log_info "Using subscription $SUBSCRIPTION"

RG="rg-vectorplayground"

# --- Infrastructure deployment ---
if [[ "$CODE_ONLY" != "true" ]]; then
  log_info "Deploying infrastructure..."
  DEPLOYMENT_NAME="vectorplayground-$(date +%Y%m%d-%H%M%S)"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would run: az deployment sub create --subscription $SUBSCRIPTION --location eastus2 --template-file $REPO_ROOT/infra/main.bicep --parameters $REPO_ROOT/infra/parameters/prod.bicepparam --name $DEPLOYMENT_NAME"
    az deployment sub what-if \
      --subscription "$SUBSCRIPTION" \
      --location eastus2 \
      --template-file "$REPO_ROOT/infra/main.bicep" \
      --parameters "$REPO_ROOT/infra/parameters/prod.bicepparam"
  else
    az deployment sub create \
      --subscription "$SUBSCRIPTION" \
      --location eastus2 \
      --template-file "$REPO_ROOT/infra/main.bicep" \
      --parameters "$REPO_ROOT/infra/parameters/prod.bicepparam" \
      --name "$DEPLOYMENT_NAME"
    log_success "Infrastructure deployed"
  fi
fi

# --- Code deployment ---
if [[ "$INFRA_ONLY" != "true" ]]; then
  # Build and deploy Function App
  log_info "Building API..."
  PUBLISH_DIR="$REPO_ROOT/api/publish"
  dotnet publish "$REPO_ROOT/api/api.csproj" -c Release -o "$PUBLISH_DIR"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would deploy Function App from $PUBLISH_DIR"
  else
    FUNC_APP="func-vectorplayground-prod"
    log_info "Deploying Function App: $FUNC_APP"
    pushd "$PUBLISH_DIR" >/dev/null
    zip -r "$REPO_ROOT/api/deploy.zip" . >/dev/null
    popd >/dev/null
    az functionapp deployment source config-zip \
      --subscription "$SUBSCRIPTION" \
      --resource-group "$RG" \
      --name "$FUNC_APP" \
      --src "$REPO_ROOT/api/deploy.zip"
    rm -f "$REPO_ROOT/api/deploy.zip"
    log_success "Function App deployed"
  fi

  # Build frontend
  log_info "Building frontend..."
  pushd "$REPO_ROOT/app" >/dev/null
  npm ci
  npm run build
  popd >/dev/null

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would deploy SWA from $REPO_ROOT/app/dist"
  else
    SWA_NAME="stapp-vectorplayground-prod"
    log_info "Deploying Static Web App: $SWA_NAME"
    DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
      --subscription "$SUBSCRIPTION" \
      --name "$SWA_NAME" \
      --resource-group "$RG" \
      --query "properties.apiKey" -o tsv)
    npx swa deploy "$REPO_ROOT/app/dist" \
      --deployment-token "$DEPLOYMENT_TOKEN" \
      --env production
    log_success "Static Web App deployed"
  fi
fi

ELAPSED=$((SECONDS - START_TIME))
log_success "Done in $(format_duration $ELAPSED)"
