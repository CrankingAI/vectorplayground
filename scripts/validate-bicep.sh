#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Validate Bicep templates for Vector Playground.

Options:
  --subscription  Azure subscription name (default: EffAz-Prod)
  -h, --help      Show this help message

Examples:
  $(basename "$0")                     # Validate all Bicep files
  $(basename "$0") --subscription X    # Use specific subscription
EOF
  exit 0
}

SUBSCRIPTION="EffAz-Prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log_info()    { echo "ℹ️  $*"; }
log_success() { echo "✅ $*"; }
log_error()   { echo "❌ $*"; }

command -v az >/dev/null 2>&1 || { log_error "Azure CLI (az) is required"; exit 1; }

az account set --subscription "$SUBSCRIPTION"

INFRA_DIR="$REPO_ROOT/infra"
ERRORS=0

# Step 1: Syntax validation
log_info "Validating Bicep syntax..."
for f in "$INFRA_DIR"/*.bicep; do
  if az bicep build --file "$f" --stdout >/dev/null 2>&1; then
    log_success "$(basename "$f")"
  else
    log_error "$(basename "$f")"
    az bicep build --file "$f" --stdout 2>&1 || true
    ERRORS=$((ERRORS + 1))
  fi
done

if [[ $ERRORS -gt 0 ]]; then
  log_error "$ERRORS file(s) have syntax errors"
  exit 1
fi

# Step 2: What-if analysis
log_info "Running what-if analysis..."
export FOUNDRY_API_KEY="${FOUNDRY_API_KEY:-placeholder}"

az deployment sub what-if \
  --location eastus2 \
  --template-file "$INFRA_DIR/main.bicep" \
  --parameters "$INFRA_DIR/parameters/prod.bicepparam"

log_success "Validation complete"
