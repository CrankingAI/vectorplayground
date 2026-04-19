# PR Staging Environments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PR-based preview environments where both frontend and API changes are testable before merging to main.

**Architecture:** SWA preview environments (automatic per PR) call a Function App staging deployment slot directly via `VITE_API_BASE_URL`. Production continues using the linked backend proxy unchanged.

**Tech Stack:** Bicep (Azure Functions slot), TypeScript/Vite (env var config), GitHub Actions (staging deploy jobs)

**Spec:** `docs/superpowers/specs/2026-04-19-pr-staging-environments-design.md`

---

### Task 1: Create frontend API base URL config

**Files:**

- Create: `app/src/config.ts`

- [ ] **Step 1: Create the config module**

Create `app/src/config.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
```

This exports a single constant. When `VITE_API_BASE_URL` is not set (production), it defaults to `/api` (linked backend proxy). When set (PR builds), it points to the staging slot URL.

- [ ] **Step 2: Verify the build passes**

Run:

```bash
cd app && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/config.ts
git commit -m "feat: add API base URL config for staging environments"
```

---

### Task 2: Update useCompare to use API base URL config

**Files:**

- Modify: `app/src/hooks/useCompare.ts:1,43`

- [ ] **Step 1: Add import and update fetch URL**

In `app/src/hooks/useCompare.ts`, add the import at line 1 and update the fetch call at line 43.

Add import at top of file:

```typescript
import { API_BASE_URL } from '../config';
```

Change line 43 from:

```typescript
      const response = await fetch(`/api/ComparePhrases?${params}`);
```

to:

```typescript
      const response = await fetch(`${API_BASE_URL}/ComparePhrases?${params}`);
```

- [ ] **Step 2: Verify the build passes**

Run:

```bash
cd app && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useCompare.ts
git commit -m "feat: use API base URL config in useCompare hook"
```

---

### Task 3: Update useHealthStatus to use API base URL config

**Files:**

- Modify: `app/src/hooks/useHealthStatus.ts:1,31`

- [ ] **Step 1: Add import and update fetch URL**

In `app/src/hooks/useHealthStatus.ts`, add the import at line 1 and update the fetch call at line 31.

Add import at top of file:

```typescript
import { API_BASE_URL } from '../config';
```

Change line 31 from:

```typescript
        const res = await fetch('/api/readyz');
```

to:

```typescript
        const res = await fetch(`${API_BASE_URL}/readyz`);
```

- [ ] **Step 2: Verify the build passes**

Run:

```bash
cd app && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useHealthStatus.ts
git commit -m "feat: use API base URL config in useHealthStatus hook"
```

---

### Task 4: Add Function App staging deployment slot in Bicep

**Files:**

- Modify: `infra/functionApp.bicep:91-99` (add resource before outputs, add new output)

- [ ] **Step 1: Add staging slot resource**

In `infra/functionApp.bicep`, add the following resource block after the `functionApp` resource (before the `// ── Outputs` section at line 93):

```bicep
// ── Staging Deployment Slot ────────────────────────────────────────────────────

@description('Staging deployment slot for PR preview environments.')
resource stagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: functionApp
  name: 'staging'
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|10.0'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/livez'
      cors: {
        allowedOrigins: [
          '*'
        ]
      }
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=core.windows.net;AccountKey=${storageAccount.listKeys().keys[0].value}' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'Foundry__Endpoint', value: foundryEndpoint }
        { name: 'Foundry__ApiKey', value: foundryAccount.listKeys().key1 }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
    }
  }
  tags: {
    project: 'vectorplayground'
    environment: '${environmentName}-staging'
  }
}
```

Key differences from the production slot:

- `alwaysOn: false` — staging doesn't need to stay warm
- `cors.allowedOrigins: ['*']` — allows any SWA preview URL (non-production, safe)
- Tag `environment` is `prod-staging` to distinguish from production

- [ ] **Step 2: Add staging slot output**

Add to the outputs section at the end of `infra/functionApp.bicep`:

```bicep
@description('Staging slot default hostname for PR preview environments.')
output stagingSlotHostname string = stagingSlot.properties.defaultHostName
```

- [ ] **Step 3: Verify Bicep compiles**

Run:

```bash
az bicep build --file infra/functionApp.bicep
```

Expected: No errors. Produces `functionApp.json` (delete the generated JSON after — the repo uses `.bicep` source files only).

```bash
rm -f infra/functionApp.json
```

- [ ] **Step 4: Commit**

```bash
git add infra/functionApp.bicep
git commit -m "feat: add Function App staging deployment slot for PR previews"
```

---

### Task 5: Add CI/CD staging deploy jobs

**Files:**

- Modify: `.github/workflows/deploy.yml:56-105`

- [ ] **Step 1: Add deploy-api-staging job**

In `.github/workflows/deploy.yml`, add the following job after `build-app` (line 56) and before `deploy-api` (line 57):

```yaml
  deploy-api-staging:
    needs: build-api
    if: github.event_name == 'pull_request' && github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Download API artifact
        uses: actions/download-artifact@v4
        with:
          name: api-publish
          path: api-publish

      - name: Deploy to staging slot
        uses: Azure/functions-action@v1
        with:
          app-name: func-vectorplayground-prod
          slot-name: staging
          package: api-publish
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE }}
```

- [ ] **Step 2: Add deploy-swa-staging job**

Add the following job after the `deploy-api-staging` job:

```yaml
  deploy-swa-staging:
    needs: build-app
    if: github.event_name == 'pull_request' && github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        working-directory: app
        run: npm ci

      - name: Build with staging API URL
        working-directory: app
        run: npm run build
        env:
          VITE_API_BASE_URL: https://func-vectorplayground-prod-staging.azurewebsites.net/api

      - name: Deploy to SWA staging
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.SWA_DEPLOYMENT_TOKEN }}
          action: upload
          app_location: app/dist
          skip_app_build: true
          skip_api_build: true
```

Note: This job rebuilds the frontend with the staging API URL baked in. It cannot reuse the `app-dist` artifact from `build-app` because that artifact was built without `VITE_API_BASE_URL`. The SWA deploy action automatically creates a preview environment when triggered from a PR context.

- [ ] **Step 3: Validate the YAML syntax**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add CI/CD jobs for PR staging deploys"
```

---

### Task 6: Final verification

- [ ] **Step 1: Verify API builds**

Run:

```bash
dotnet build api/api.csproj
```

Expected: Build succeeded.

- [ ] **Step 2: Verify frontend builds (production mode, no env var)**

Run:

```bash
cd app && npm run build
```

Expected: Build succeeds. The app uses `/api` as the default base URL.

- [ ] **Step 3: Verify frontend builds (staging mode, with env var)**

Run:

```bash
cd app && VITE_API_BASE_URL=https://func-vectorplayground-prod-staging.azurewebsites.net/api npm run build
```

Expected: Build succeeds. The app has the staging URL baked in.

- [ ] **Step 4: Verify Bicep compiles end-to-end**

Run:

```bash
az bicep build --file infra/main.bicep && rm -f infra/*.json
```

Expected: No errors.

---

### Post-Implementation: Manual Setup Required

After merging, these one-time manual steps are needed before PR staging deploys will work:

1. **Deploy infrastructure** to create the staging slot:

   ```bash
   ./scripts/deploy.sh --infra-only
   ```

2. **Get the staging slot publish profile** from the Azure Portal:
   - Navigate to `func-vectorplayground-prod` > Deployment slots > `staging`
   - Download publish profile

3. **Add GitHub Actions secret**:
   - Repository Settings > Secrets and variables > Actions
   - Add `AZURE_FUNCTIONAPP_STAGING_PUBLISH_PROFILE` with the downloaded publish profile content
