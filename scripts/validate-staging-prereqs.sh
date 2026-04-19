#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# validate-staging-prereqs.sh -- Validate PR staging deployment prerequisites
#
# Usage:
#   ./scripts/validate-staging-prereqs.sh
#   ./scripts/validate-staging-prereqs.sh --bootstrap
#   ./scripts/validate-staging-prereqs.sh --set-secret
#
# Checks that the Azure Functions staging slot exists and that the GitHub
# Actions secret AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE is configured.
# Optionally bootstraps the missing prerequisites and sets the secret.
# ---------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Validate the prerequisites required for PR staging deployments.

Options:
  --bootstrap                If the staging slot is missing, deploy infra from a
                             branch that contains the staging setup and then set
                             the GitHub secret if needed
  --set-secret               Fetch the staging slot publish profile and set
                             AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE if missing
  --staging-branch <name>    Branch that contains the staging infra/workflow
                             (default: feat/pr-staging-environments)
  --subscription <name>      Azure subscription name or ID (default: BillDevPlayground)
  --repo <owner/name>        GitHub repository (default: CrankingAI/vectorplayground)
  --resource-group <name>    Azure resource group (default: rg-vectorplayground)
  --function-app <name>      Azure Function App name (default: func-vectorplayground-prod)
  --slot <name>              Function App slot name (default: staging)
  --secret-name <name>       GitHub Actions secret to verify
                             (default: AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE)
  -h, --help, help           Show this help

Examples:
  $(basename "$0")
  $(basename "$0") --bootstrap
  $(basename "$0") --set-secret
  $(basename "$0") --subscription BillDevPlayground
EOF
  exit 0
}

BOOTSTRAP=false
SET_SECRET=false
STAGING_BRANCH="feat/pr-staging-environments"
SUBSCRIPTION="BillDevPlayground"
REPO="CrankingAI/vectorplayground"
RESOURCE_GROUP="rg-vectorplayground"
FUNCTION_APP="func-vectorplayground-prod"
SLOT_NAME="staging"
SECRET_NAME="AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE"
ORIGINAL_BRANCH=""
BOOTSTRAP_BRANCH=""
SWITCHED_BRANCH=false

case "${1:-}" in
  -h|--help|help) usage ;;
esac

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help|help) usage ;;
    --bootstrap) BOOTSTRAP=true; shift ;;
    --set-secret) SET_SECRET=true; shift ;;
    --staging-branch) STAGING_BRANCH="$2"; shift 2 ;;
    --subscription) SUBSCRIPTION="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --resource-group) RESOURCE_GROUP="$2"; shift 2 ;;
    --function-app) FUNCTION_APP="$2"; shift 2 ;;
    --slot) SLOT_NAME="$2"; shift 2 ;;
    --secret-name) SECRET_NAME="$2"; shift 2 ;;
    *) echo "Error: unknown option: $1"; usage ;;
  esac
done

format_duration() {
  local total_seconds="$1"
  local hours=$(( total_seconds / 3600 ))
  local minutes=$(( (total_seconds % 3600) / 60 ))
  local seconds=$(( total_seconds % 60 ))

  if (( hours > 0 )); then
    printf '%dh %02dm %02ds' "$hours" "$minutes" "$seconds"
  elif (( minutes > 0 )); then
    printf '%dm %02ds' "$minutes" "$seconds"
  else
    printf '%ds' "$seconds"
  fi
}

step() {
  echo "==> $*"
}

note() {
  echo "    $*"
}

success() {
  echo "[+] $*"
}

warn() {
  echo "[!] $*"
}

fail() {
  echo "[x] $*"
  exit 1
}

current_branch() {
  git -C "$REPO_ROOT" branch --show-current
}

working_tree_clean() {
  git -C "$REPO_ROOT" diff --quiet --ignore-submodules -- && \
    git -C "$REPO_ROOT" diff --cached --quiet --ignore-submodules --
}

ensure_local_branch() {
  local branch="$1"

  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    return 0
  fi

  if git -C "$REPO_ROOT" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    step "Fetching branch '$branch' from origin"
    git -C "$REPO_ROOT" fetch origin "$branch:$branch"
    return 0
  fi

  return 1
}

branch_has_staging_setup() {
  local branch="$1"

  git -C "$REPO_ROOT" show "$branch:infra/functionApp.bicep" 2>/dev/null | \
    grep -q "resource stagingSlot 'Microsoft.Web/sites/slots@" && \
  git -C "$REPO_ROOT" show "$branch:.github/workflows/deploy.yml" 2>/dev/null | \
    grep -q '^  deploy-api-staging:'
}

cleanup() {
  local exit_code=$?

  if [[ "$SWITCHED_BRANCH" == "true" && -n "$ORIGINAL_BRANCH" ]]; then
    set +e
    if [[ "$(current_branch 2>/dev/null)" != "$ORIGINAL_BRANCH" ]]; then
      step "Restoring original branch"
      if git -C "$REPO_ROOT" switch "$ORIGINAL_BRANCH" >/dev/null 2>&1; then
        note "Switched back to $ORIGINAL_BRANCH"
      else
        warn "Could not switch back to '$ORIGINAL_BRANCH' automatically"
      fi
    fi
  fi

  exit "$exit_code"
}

check_slot() {
  slot_exists=false

  step "Checking Azure Function App staging slot"
  if slot_count=$(az functionapp deployment slot list \
    --subscription "$SUBSCRIPTION" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP" \
    --query "[?name=='$SLOT_NAME'] | length(@)" \
    -o tsv); then
    if [[ "$slot_count" == "1" ]]; then
      slot_exists=true
      success "Found slot '$SLOT_NAME' on Function App '$FUNCTION_APP'"
    else
      warn "Slot '$SLOT_NAME' does not exist on Function App '$FUNCTION_APP'"
    fi
  else
    warn "Unable to query deployment slots for Function App '$FUNCTION_APP' in resource group '$RESOURCE_GROUP'"
  fi
}

check_secret() {
  secret_exists=false

  step "Checking GitHub Actions secret"
  if secret_names=$(gh secret list --repo "$REPO" --json name --jq '.[].name'); then
    if grep -qx "$SECRET_NAME" <<< "$secret_names"; then
      secret_exists=true
      success "Found GitHub secret '$SECRET_NAME' in $REPO"
    else
      warn "GitHub secret '$SECRET_NAME' is not configured in $REPO"
    fi
  else
    warn "Unable to query GitHub Actions secrets for '$REPO'"
  fi
}

determine_bootstrap_branch() {
  ORIGINAL_BRANCH="$(current_branch)"

  if [[ -z "$ORIGINAL_BRANCH" ]]; then
    fail "Unable to determine the current git branch. Bootstrap requires a normal branch checkout."
  fi

  if branch_has_staging_setup "$ORIGINAL_BRANCH"; then
    BOOTSTRAP_BRANCH="$ORIGINAL_BRANCH"
    note "Current branch '$ORIGINAL_BRANCH' contains the staging setup"
    return 0
  fi

  ensure_local_branch "$STAGING_BRANCH" || \
    fail "Staging branch '$STAGING_BRANCH' was not found locally or on origin."

  branch_has_staging_setup "$STAGING_BRANCH" || \
    fail "Branch '$STAGING_BRANCH' does not contain the expected staging setup."

  BOOTSTRAP_BRANCH="$STAGING_BRANCH"
  note "Using staging branch '$BOOTSTRAP_BRANCH' for infrastructure deployment"

  if [[ "$ORIGINAL_BRANCH" != "$BOOTSTRAP_BRANCH" ]] && ! working_tree_clean; then
    fail "Working tree has uncommitted changes on '$ORIGINAL_BRANCH'. Commit or stash them before bootstrap can switch branches."
  fi
}

bootstrap_slot() {
  determine_bootstrap_branch

  step "Bootstrapping staging infrastructure"
  if [[ "$BOOTSTRAP_BRANCH" != "$ORIGINAL_BRANCH" ]]; then
    note "Switching from '$ORIGINAL_BRANCH' to '$BOOTSTRAP_BRANCH'"
    git -C "$REPO_ROOT" switch "$BOOTSTRAP_BRANCH"
    SWITCHED_BRANCH=true
  else
    note "Using current branch '$BOOTSTRAP_BRANCH'"
  fi

  bash "$REPO_ROOT/scripts/deploy.sh" --infra-only --subscription "$SUBSCRIPTION"
  check_slot

  if [[ "$slot_exists" != "true" ]]; then
    fail "Infrastructure deployment finished but slot '$SLOT_NAME' is still missing. Inspect the deploy output and Azure resources."
  fi
}

set_secret_from_slot() {
  if [[ "$slot_exists" != "true" ]]; then
    warn "Cannot set '$SECRET_NAME' because slot '$SLOT_NAME' does not exist yet"
    return 1
  fi

  step "Fetching staging slot publish profile"
  publish_profile=$(az functionapp deployment list-publishing-profiles \
    --subscription "$SUBSCRIPTION" \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP" \
    --slot "$SLOT_NAME" \
    --xml)

  step "Setting GitHub secret '$SECRET_NAME'"
  gh secret set "$SECRET_NAME" --repo "$REPO" --body "$publish_profile"
  secret_exists=true
  success "Set GitHub secret '$SECRET_NAME' in $REPO"
}

trap cleanup EXIT

command -v az >/dev/null 2>&1 || fail "Azure CLI (az) is required. Install it with: brew install azure-cli"
command -v gh >/dev/null 2>&1 || fail "GitHub CLI (gh) is required. Install it with: brew install gh"

git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || \
  fail "This script must be run from within the repository worktree."

START_TIME=$(date +%s)
echo "🚀 clock started ($(date '+%H:%M:%S'))"

step "Checking Azure access"
if az account show --subscription "$SUBSCRIPTION" --query id -o tsv >/dev/null; then
  note "Using subscription: $SUBSCRIPTION"
else
  fail "Unable to access Azure subscription '$SUBSCRIPTION'. Run 'az login' and verify your subscription access."
fi

step "Checking GitHub access"
if gh auth status >/dev/null 2>&1; then
  note "GitHub CLI authentication is available"
else
  fail "GitHub CLI is not authenticated. Run 'gh auth login' and retry."
fi

check_slot
check_secret

if [[ "$BOOTSTRAP" == "true" && "$slot_exists" == "false" ]]; then
  bootstrap_slot
fi

if [[ "$SET_SECRET" == "true" && "$secret_exists" == "false" ]]; then
  set_secret_from_slot || true
fi

if [[ "$BOOTSTRAP" == "true" && "$secret_exists" == "false" ]]; then
  set_secret_from_slot || true
fi

if [[ "$BOOTSTRAP" == "true" ]]; then
  check_secret
fi

echo ""
if [[ "$slot_exists" == "true" && "$secret_exists" == "true" ]]; then
  success "PR staging deployment prerequisites are ready"
  note "Next: open or update a PR from the staging branch to trigger the staging workflow"
  EXIT_CODE=0
else
  warn "PR staging deployment prerequisites are not ready"

  if [[ "$slot_exists" == "false" ]]; then
    note "Create the staging slot by deploying the infrastructure that includes it, then rerun this script"
    note "Run $(basename "$0") --bootstrap to deploy the staging infra automatically"
    note "Or switch to the staging branch and run ./scripts/deploy.sh --infra-only"
  fi

  if [[ "$secret_exists" == "false" ]]; then
    if [[ "$slot_exists" == "true" ]]; then
      note "Run $(basename "$0") --set-secret to fetch the slot publish profile and configure '$SECRET_NAME'"
    fi
    note "Run $(basename "$0") --bootstrap to set the missing secret automatically after infra is ready"
    note "Or set the secret manually in GitHub Actions secrets for $REPO"
  fi

  EXIT_CODE=1
fi

ELAPSED=$(( $(date +%s) - START_TIME ))
echo "🏁 clock stopped (took $(format_duration "$ELAPSED"), ended $(date '+%H:%M:%S'))"

exit "$EXIT_CODE"