#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Fetch the two GitHub Actions secrets needed for CI/CD and optionally
set them directly on the repository.

Secrets retrieved:
  SWA_DEPLOYMENT_TOKEN              Static Web App deployment token
  AZURE_FUNCTIONAPP_PUBLISH_PROFILE Function App publish profile (XML)

Options:
  --set           Set secrets on CrankingAI/vectorplayground via gh CLI
  --subscription  Azure subscription name (default: BillDev)
  -h, --help      Show this help message

Examples:
  $(basename "$0")          # Print secrets to stdout
  $(basename "$0") --set    # Set secrets on GitHub repo directly
EOF
  exit 0
}

SET_SECRETS=false
SUBSCRIPTION="BillDevPlayground"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --set) SET_SECRETS=true; shift ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log_info()    { echo -e "\033[34m[i]\033[0m $*"; }
log_success() { echo -e "\033[32m[+]\033[0m $*"; }
log_error()   { echo -e "\033[31m[x]\033[0m $*"; }

command -v az >/dev/null 2>&1 || { log_error "Azure CLI (az) is required"; exit 1; }

RG="rg-vectorplayground"
SWA_NAME="stapp-vectorplayground-prod"
FUNC_NAME="func-vectorplayground-prod"

az account set --subscription "$SUBSCRIPTION"

# 1. SWA deployment token
log_info "Fetching SWA deployment token..."
SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RG" \
  --query "properties.apiKey" -o tsv)

# 2. Function App publish profile
log_info "Fetching Function App publish profile..."
PUBLISH_PROFILE=$(az functionapp deployment list-publishing-profiles \
  --name "$FUNC_NAME" \
  --resource-group "$RG" \
  --xml)

if [[ "$SET_SECRETS" == "true" ]]; then
  command -v gh >/dev/null 2>&1 || { log_error "GitHub CLI (gh) is required for --set"; exit 1; }

  REPO="CrankingAI/vectorplayground"

  log_info "Setting SWA_DEPLOYMENT_TOKEN on $REPO..."
  gh secret set SWA_DEPLOYMENT_TOKEN --repo "$REPO" --body "$SWA_TOKEN"
  log_success "SWA_DEPLOYMENT_TOKEN set"

  log_info "Setting AZURE_FUNCTIONAPP_PUBLISH_PROFILE on $REPO..."
  gh secret set AZURE_FUNCTIONAPP_PUBLISH_PROFILE --repo "$REPO" --body "$PUBLISH_PROFILE"
  log_success "AZURE_FUNCTIONAPP_PUBLISH_PROFILE set"

  log_success "Done! Push to main and CI/CD will deploy automatically."
else
  echo ""
  echo "=== SWA_DEPLOYMENT_TOKEN ==="
  echo "$SWA_TOKEN"
  echo ""
  echo "=== AZURE_FUNCTIONAPP_PUBLISH_PROFILE ==="
  echo "$PUBLISH_PROFILE"
  echo ""
  log_info "To set these on GitHub automatically, re-run with --set"
  log_info "Or set manually at: https://github.com/CrankingAI/vectorplayground/settings/secrets/actions"
fi
