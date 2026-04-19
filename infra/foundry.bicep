@description('Deployment environment identifier.')
param environmentName string

@description('Azure region for AI Services deployment.')
param location string

// ── Types ───────────────────────────────────────────────────────────────────────

type EmbeddingModelDefinition = {
  @description('Deployment name (used as the model ID in API calls).')
  name: string

  @description('Azure model catalog name.')
  modelName: string

  @description('Model version string.')
  modelVersion: string

  @description('Tokens-per-minute capacity (in thousands).')
  capacity: int
}

// ── AI Services Account ─────────────────────────────────────────────────────────

var accountName = 'vectorplayground'

resource aiServices 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: accountName
  location: location
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: accountName
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
  tags: {
    project: 'vectorplayground'
    environment: environmentName
  }
}

// ── Embedding Model Deployments ─────────────────────────────────────────────────

var embeddingModels = [
  {
    name: 'text-embedding-ada-002'
    modelName: 'text-embedding-ada-002'
    modelVersion: '2'
    capacity: 120
  }
  {
    name: 'text-embedding-3-small'
    modelName: 'text-embedding-3-small'
    modelVersion: '1'
    capacity: 120
  }
  {
    name: 'text-embedding-3-large'
    modelName: 'text-embedding-3-large'
    modelVersion: '1'
    capacity: 120
  }
]

@batchSize(1)
resource modelDeployments 'Microsoft.CognitiveServices/accounts/deployments@2025-04-01-preview' = [
  for model in embeddingModels: {
    parent: aiServices
    name: model.name
    sku: {
      name: 'GlobalStandard'
      capacity: model.capacity
    }
    properties: {
      model: {
        format: 'OpenAI'
        name: model.modelName
        version: model.modelVersion
      }
    }
  }
]

// ── Outputs ─────────────────────────────────────────────────────────────────────

@description('AI Services REST endpoint URL.')
output foundryEndpoint string = 'https://${accountName}.cognitiveservices.azure.com/'

@description('AI Services account resource name.')
output accountName string = aiServices.name
