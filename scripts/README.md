# Scripts

Build and deployment tools for Vector Playground.

## Conventions

- All scripts start with `#!/usr/bin/env bash` and `set -euo pipefail`
- Every script supports `-h` and `--help` as first-and-only argument
- Naming: kebab-case, verb-led (e.g., `deploy.sh`, `validate-bicep.sh`)
- Azure subscription default: `BillDevPlayground`
- Resource group: `rg-vectorplayground`

## Scripts

| Script | Purpose |
|--------|---------|
| `deploy.sh` | Deploy infrastructure and/or application code |
| `validate-bicep.sh` | Validate Bicep templates (syntax + what-if) |
| `setup-env.sh` | First-time environment bootstrap |
| `get-gh-secrets.sh` | Fetch and set GitHub Actions secrets |
| `view-stats.sh` | Query Application Insights for usage stats |

## Validation

```bash
bash -n scripts/*.sh        # Syntax check
shellcheck scripts/*.sh     # Lint (recommended)
```
