#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

First-time environment setup for Vector Playground.
Deploys infrastructure, then deploys application code.

Options:
  --dry-run       Preview changes without deploying
  --subscription  Azure subscription name (default: EffAz-Prod)
  -h, --help      Show this help message

Examples:
  $(basename "$0")              # Full setup
  $(basename "$0") --dry-run    # Preview what would be created
EOF
  exit 0
}

DRY_RUN=""
SUBSCRIPTION="EffAz-Prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --dry-run) DRY_RUN="--dry-run"; shift ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log_info()    { echo -e "\033[34m[i]\033[0m $*"; }
log_success() { echo -e "\033[32m[+]\033[0m $*"; }

# Step 1: Deploy infrastructure
log_info "Phase 1: Deploying infrastructure..."
"$SCRIPT_DIR/deploy.sh" --infra-only --subscription "$SUBSCRIPTION" $DRY_RUN

# Step 2: Fetch the Foundry API key from the newly created resource
if [[ -z "$DRY_RUN" ]]; then
  log_info "Fetching Foundry API key..."
  export FOUNDRY_API_KEY
  FOUNDRY_API_KEY=$(az cognitiveservices account keys list \
    --name "vectorplayground" \
    --resource-group "rg-vectorplayground" \
    --query "key1" -o tsv)
fi

# Step 3: Deploy code
log_info "Phase 2: Deploying application code..."
"$SCRIPT_DIR/deploy.sh" --code-only --subscription "$SUBSCRIPTION" $DRY_RUN

log_success "Environment setup complete"
log_info "Next steps:"
log_info "  1. Configure DNS: CNAME vectorplayground.com -> SWA default hostname"
log_info "  2. Configure DNS: CNAME www.vectorplayground.com -> SWA default hostname"
