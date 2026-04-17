@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for the Function App and App Service Plan.')
param location string

@description('Azure AI Foundry endpoint URL.')
param foundryEndpoint string

@description('Azure AI Foundry API key.')
@secure()
param foundryApiKey string

@description('Storage account name for Azure Functions runtime.')
param storageAccountName string

@description('Application Insights connection string for telemetry.')
param appInsightsConnectionString string

// ── App Service Plan ────────────────────────────────────────────────────────────

var planName = 'plan-vectorplayground-${environmentName}'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: 'S1'
    tier: 'Standard'
  }
  properties: {
    reserved: true // Linux
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Storage Account Reference ───────────────────────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// ── Function App ────────────────────────────────────────────────────────────────

var functionAppName = 'func-vectorplayground-${environmentName}'

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
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
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/livez'
      cors: {
        allowedOrigins: [
          'https://vectorplayground.com'
          'https://www.vectorplayground.com'
        ]
      }
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=core.windows.net;AccountKey=${storageAccount.listKeys().keys[0].value}' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'Foundry__Endpoint', value: foundryEndpoint }
        { name: 'Foundry__ApiKey', value: foundryApiKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
    }
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Function App resource name.')
output functionAppName string = functionApp.name

@description('Function App resource ID (used by SWA linked backend).')
output functionAppId string = functionApp.id

@description('Function App default hostname.')
output functionAppHostname string = functionApp.properties.defaultHostName
