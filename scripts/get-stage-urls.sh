#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

List Static Web App environment URLs (production + PR previews).

Options:
  --subscription  Azure subscription name (default: EffAz-Prod)
  -h, --help      Show this help message

Examples:
  $(basename "$0")                          # List all environment URLs
  $(basename "$0") --subscription MyOther   # Use a different subscription
EOF
  exit "${1:-0}"
}

SUBSCRIPTION="EffAz-Prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

command -v az >/dev/null 2>&1 || { echo "Azure CLI (az) is required"; exit 1; }

az staticwebapp environment list \
  --subscription "$SUBSCRIPTION" \
  --name stapp-vectorplayground \
  --resource-group rg-vectorplayground \
  --query "[].{env:name, url:join('', ['https://', hostname])}" \
  -o table
