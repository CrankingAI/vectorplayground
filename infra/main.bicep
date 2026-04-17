targetScope = 'subscription'

@description('Deployment environment identifier.')
@allowed(['prod'])
param environmentName string = 'prod'

@description('Primary Azure region for all resources.')
param location string = 'eastus2'

@description('API key for Azure AI Foundry (AI Services). Sourced from environment variable at deploy time.')
@secure()
param foundryApiKey string

@description('Whether to configure Static Web App custom domains. Requires public DNS validation records to exist first.')
param enableCustomDomains bool = false

@description('Apex custom domain for the Static Web App. Leave empty to skip.')
param apexCustomDomain string = ''

@description('Subdomain custom domain for the Static Web App. Leave empty to skip.')
param wwwCustomDomain string = ''

// ── Resource Group ──────────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-vectorplayground'
  location: location
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Modules ─────────────────────────────────────────────────────────────────────

module monitoring 'monitoring.bicep' = {
  scope: rg
  name: 'monitoring-${environmentName}'
  params: {
    environmentName: environmentName
    location: location
  }
}

module storage 'storage.bicep' = {
  scope: rg
  name: 'storage-${environmentName}'
  params: {
    environmentName: environmentName
    location: location
  }
}

module foundry 'foundry.bicep' = {
  scope: rg
  name: 'foundry-${environmentName}'
  params: {
    environmentName: environmentName
    location: location
  }
}

module functionApp 'functionApp.bicep' = {
  scope: rg
  name: 'functionApp-${environmentName}'
  params: {
    environmentName: environmentName
    location: location
    foundryEndpoint: foundry.outputs.foundryEndpoint
    foundryApiKey: foundryApiKey
    storageAccountName: storage.outputs.storageAccountName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
  }
}

module staticWebApp 'staticWebApp.bicep' = {
  scope: rg
  name: 'staticWebApp-${environmentName}'
  params: {
    environmentName: environmentName
    location: location
    functionAppId: functionApp.outputs.functionAppId
    enableCustomDomains: enableCustomDomains
    apexCustomDomain: apexCustomDomain
    wwwCustomDomain: wwwCustomDomain
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Name of the deployed resource group.')
output resourceGroupName string = rg.name

@description('Name of the Static Web App resource.')
output staticWebAppName string = staticWebApp.outputs.staticWebAppName

@description('Default hostname of the Static Web App (before custom domain).')
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname

@description('Name of the Function App resource.')
output functionAppName string = functionApp.outputs.functionAppName

@description('Azure AI Foundry endpoint URL.')
output foundryEndpoint string = foundry.outputs.foundryEndpoint

@description('AI Services account name.')
output foundryAccountName string = foundry.outputs.accountName
