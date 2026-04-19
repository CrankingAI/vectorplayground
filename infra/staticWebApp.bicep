@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for the Static Web App.')
param location string

@description('Resource ID of the Function App to link as the API backend.')
param functionAppId string

@description('Whether to configure custom domains for the Static Web App. Requires public DNS validation records to exist first.')
param enableCustomDomains bool = false

@description('Apex custom domain for the Static Web App. Leave empty to skip.')
param apexCustomDomain string = ''

@description('Subdomain custom domain for the Static Web App. Leave empty to skip.')
param wwwCustomDomain string = ''

// ── Static Web App ──────────────────────────────────────────────────────────────

var staticWebAppName = 'stapp-vectorplayground'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Linked Backend (routes /api/* to Function App) ──────────────────────────────

resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionAppId
    region: location
  }
}

// ── Custom Domains ──────────────────────────────────────────────────────────────

resource customDomainApex 'Microsoft.Web/staticSites/customDomains@2023-12-01' = if (enableCustomDomains && !empty(apexCustomDomain)) {
  parent: staticWebApp
  name: apexCustomDomain
  properties: {
    validationMethod: 'dns-txt-token'
  }
}

resource customDomainWww 'Microsoft.Web/staticSites/customDomains@2023-12-01' = if (enableCustomDomains && !empty(wwwCustomDomain)) {
  parent: staticWebApp
  name: wwwCustomDomain
  properties: {
    validationMethod: 'dns-txt-token'
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Static Web App resource name.')
output staticWebAppName string = staticWebApp.name

@description('Auto-generated default hostname (e.g., lively-xxx-123.azurestaticapps.net).')
output defaultHostname string = staticWebApp.properties.defaultHostname
