targetScope = 'resourceGroup'

@description('Environment name')
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'brolonist'

var resourcePrefix = '${baseName}-${environment}'

module appService 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    name: '${resourcePrefix}-api'
    location: location
    redisConnectionString: redis.outputs.connectionString
    postgresConnectionString: postgres.outputs.connectionString
    keyVaultName: keyVault.outputs.name
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    name: '${resourcePrefix}-web'
    location: location
  }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    name: '${resourcePrefix}-redis'
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: '${resourcePrefix}-pg'
    location: location
    administratorLogin: 'brolonist'
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVault'
  params: {
    name: '${resourcePrefix}-kv'
    location: location
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    name: '${resourcePrefix}-insights'
    location: location
  }
}
