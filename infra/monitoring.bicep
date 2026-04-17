@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for monitoring resources.')
param location string

// ── Log Analytics Workspace ─────────────────────────────────────────────────────

var lawName = 'law-vectorplayground-${environmentName}'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: lawName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Application Insights ────────────────────────────────────────────────────────

var appInsightsName = 'appi-vectorplayground-${environmentName}'

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Log Analytics workspace resource ID.')
output logAnalyticsWorkspaceId string = logAnalytics.id

@description('Application Insights connection string for SDK configuration.')
output appInsightsConnectionString string = appInsights.properties.ConnectionString

@description('Application Insights instrumentation key (legacy).')
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
