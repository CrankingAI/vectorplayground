@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for the Function App and App Service Plan.')
param location string

@description('Azure AI Foundry endpoint URL.')
param foundryEndpoint string

@description('Azure AI Foundry account name.')
param foundryAccountName string

@description('Storage account name for Azure Functions runtime.')
param storageAccountName string

@description('Application Insights connection string for telemetry.')
param appInsightsConnectionString string

// ── App Service Plan ────────────────────────────────────────────────────────────

var planName = 'plan-vectorplayground'

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

resource foundryAccount 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' existing = {
  name: foundryAccountName
}

// ── Function App ────────────────────────────────────────────────────────────────

var functionAppName = 'func-vectorplayground'

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
      alwaysOn: true
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
        { name: 'Foundry__ApiKey', value: foundryAccount.listKeys().key1 }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
    }
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

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

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Function App resource name.')
output functionAppName string = functionApp.name

@description('Function App resource ID (used by SWA linked backend).')
output functionAppId string = functionApp.id

@description('Function App default hostname.')
output functionAppHostname string = functionApp.properties.defaultHostName

@description('Staging slot default hostname for PR preview environments.')
output stagingSlotHostname string = stagingSlot.properties.defaultHostName
