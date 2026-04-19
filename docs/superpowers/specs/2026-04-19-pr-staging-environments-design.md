# PR Staging Environments Design

## Problem

When a PR is opened, the current CI/CD pipeline builds both the frontend and API but only deploys on merge to `main`. There is no way to preview frontend or API changes from a PR in a live environment. The SWA Standard tier already supports preview environments, and the workflow already has PR triggers and a `close-staging` job, but nothing actually deploys on PR.

The deeper challenge: SWA's linked backend is a resource-level configuration. All SWA preview environments share the same linked backend (production Function App). If a PR includes API changes, the SWA preview environment won't reflect them.

## Design

### Architecture

```plaintext
PR opened/updated:
  ┌─────────────────────────────────────┐
  │  SWA Preview Environment            │
  │  (auto-created per PR)              │
  │  https://<hash>.azurestaticapps.net │
  │                                     │
  │  VITE_API_BASE_URL set to           │
  │  staging slot URL                   │
  └────────────┬────────────────────────┘
               │ direct fetch (not linked backend)
               ▼
  ┌─────────────────────────────────────┐
  │  Function App Staging Slot          │
  │  func-vectorplayground-prod/staging │
  │  https://func-vectorplayground-     │
  │    prod-staging.azurewebsites.net   │
  │                                     │
  │  CORS: *.azurestaticapps.net        │
  └─────────────────────────────────────┘

Production (unchanged):
  ┌─────────────────────────────────────┐
  │  SWA Production                     │
  │  Uses linked backend (/api/* proxy) │
  └────────────┬────────────────────────┘
               │ linked backend (no CORS needed)
               ▼
  ┌─────────────────────────────────────┐
  │  Function App Production Slot       │
  │  func-vectorplayground-prod         │
  └─────────────────────────────────────┘
```

### Component Changes

#### 1. Bicep: Function App staging slot (`infra/functionApp.bicep`)

Add a `staging` deployment slot to the existing Function App. The S1 Standard plan supports up to 5 slots.

The staging slot:

- Shares the same App Service Plan (S1) as production
- Has the same app settings (runtime, Foundry endpoint, App Insights, storage)
- Has CORS configured for `https://*.azurestaticapps.net` (SWA preview URLs are subdomains of this)
- Has the same health check path (`/api/livez`)
- Does NOT need `alwaysOn` (staging doesn't need to stay warm)

New output: `stagingSlotHostname` for use in CI/CD.

#### 2. Frontend: API base URL abstraction (`app/src/`)

Currently, two files hardcode `/api/` paths:

- `app/src/hooks/useCompare.ts:43` — `` fetch(`/api/ComparePhrases?${params}`) ``
- `app/src/hooks/useHealthStatus.ts:31` — `fetch('/api/readyz')`

Create a small config module (e.g., `app/src/config.ts`) that exports the API base URL:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
```

Update the two fetch calls to use `API_BASE_URL` instead of hardcoded `/api`.

- **Production build**: `VITE_API_BASE_URL` is not set, defaults to `/api` (linked backend, zero behavior change)
- **PR build**: CI sets `VITE_API_BASE_URL` to the staging slot URL

#### 3. CI/CD: PR deploy jobs (`.github/workflows/deploy.yml`)

Add two new jobs that run on PR events (not closed):

**`deploy-api-staging`** (depends on `build-api`):

- Downloads the `api-publish` artifact
- Deploys to the `staging` slot using `Azure/functions-action@v1` with `slot-name: staging`
- Uses a new secret: `AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE`

**`deploy-swa-staging`** (depends on `build-app`):

- Rebuilds the frontend with `VITE_API_BASE_URL` set to `https://func-vectorplayground-prod-staging.azurewebsites.net/api`
- Deploys to SWA as a preview environment using `Azure/static-web-apps-deploy@v1`
- The SWA deploy action automatically creates a preview environment when triggered from a PR context

The existing `close-staging` job already handles SWA preview cleanup on PR close. No changes needed there.

#### 4. CORS on staging slot

The staging slot needs CORS because the SWA preview environment calls it directly (not via linked backend proxy). The allowed origin is `https://*.azurestaticapps.net`.

Note: Azure Functions CORS does not support wildcard subdomains natively. The Bicep `cors.allowedOrigins` array requires exact origins. Two options:

- **Option A (recommended)**: Disable CORS in Azure Functions for the staging slot (`allowedOrigins: ['*']`) and rely on the fact that staging is non-production. This is safe because the staging slot only exists for PR previews and carries no production data.
- **Option B**: Set CORS dynamically in CI/CD after each PR deploy, using `az functionapp cors add` with the specific SWA preview URL. This is more secure but adds CI complexity.

We'll go with **Option A** for simplicity — staging slot allows all origins.

### Secrets Required

One new GitHub Actions secret:

| Secret | Purpose |
|--------|---------|
| `AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE` | Publish profile for the staging deployment slot |

This must be obtained from the staging slot (not the production slot) after the Bicep deployment creates it.

### Known Limitations

1. **Single staging slot**: Concurrent PRs share the same staging API slot. The last PR to deploy "wins." This is acceptable for a small team/solo project. Per-PR Function Apps would require dynamic infrastructure provisioning.
2. **Shared App Service Plan**: The staging slot runs on the same S1 plan as production. No risk for a preview environment, but don't load test against it.
3. **Shared backing services**: The staging slot uses the same Foundry endpoint, storage account, and App Insights as production. Embedding API calls from staging will consume the same TPM quota. This is fine for preview testing.
4. **First deploy**: After adding the staging slot via Bicep, you must manually download the staging slot's publish profile from the Azure Portal and add it as a GitHub Actions secret before PR deploys will work.

### What Does NOT Change

- Production deployment flow (push to `main`) is unchanged
- SWA linked backend for production is unchanged
- `staticwebapp.config.json` is unchanged
- Function App production slot configuration is unchanged
- No new Azure resources beyond the deployment slot (no new App Service Plan, no new Function App)
