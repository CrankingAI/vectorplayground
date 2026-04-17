using '../main.bicep'

param environmentName = 'prod'
param location = 'eastus2'
param foundryApiKey = readEnvironmentVariable('FOUNDRY_API_KEY', 'placeholder')
param enableCustomDomains = false
param apexCustomDomain = 'vectorplayground.com'
param wwwCustomDomain = 'www.vectorplayground.com'
