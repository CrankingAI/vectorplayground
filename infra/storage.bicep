@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for the storage account.')
param location string

// ── Storage Account ─────────────────────────────────────────────────────────────

@description('Storage account name (max 24 chars, no hyphens).')
var storageAccountName = 'stvectorplayground${environmentName}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('Storage account resource name.')
output storageAccountName string = storageAccount.name
