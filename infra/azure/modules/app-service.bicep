param name string
param location string
param redisConnectionString string
param postgresConnectionString string
param keyVaultName string

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${name}-plan'
  location: location
  sku: { name: 'B1', tier: 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
}

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      webSocketsEnabled: true
      appSettings: [
        { name: 'REDIS_URL', value: redisConnectionString }
        { name: 'DATABASE_URL', value: postgresConnectionString }
        { name: 'NODE_ENV', value: 'production' }
      ]
    }
  }
}

output url string = 'https://${appService.properties.defaultHostName}'
