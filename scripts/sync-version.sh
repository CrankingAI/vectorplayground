#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Sync version from the repo-root VERSION file into derived locations
(currently: app/package.json). Run before frontend builds, or whenever
VERSION changes. The .NET API reads VERSION directly via MSBuild and
does not need this script.

Options:
  --check     Exit non-zero if any derived file is out of sync (no writes)
  -h, --help  Show this help message
EOF
  exit 0
}

CHECK_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --check) CHECK_ONLY=1; shift ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

VERSION_FILE="$REPO_ROOT/VERSION"
PKG_JSON="$REPO_ROOT/app/package.json"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "VERSION file not found at $VERSION_FILE" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"

if [[ -z "$VERSION" ]]; then
  echo "VERSION file is empty" >&2
  exit 1
fi

CURRENT="$(node -p "require('$PKG_JSON').version")"

if [[ "$CURRENT" == "$VERSION" ]]; then
  echo "app/package.json already at $VERSION"
  exit 0
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "Out of sync: app/package.json is $CURRENT, VERSION is $VERSION" >&2
  exit 1
fi

node -e "
  const fs = require('fs');
  const path = '$PKG_JSON';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

echo "Updated app/package.json: $CURRENT -> $VERSION"
