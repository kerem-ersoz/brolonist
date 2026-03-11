// Azure Bicep template for Brolonist — Container Apps pattern (matching Gonul)
// Deploy: az deployment group create --resource-group brolonist-rg --template-file azure/main.bicep

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param appName string = 'brolonist'

@description('Container image to deploy')
param containerImage string = 'ghcr.io/kerem-ersoz/brolonist:main'

@description('Redis SKU')
@allowed(['Basic', 'Standard'])
param redisSku string = 'Standard'

@description('Redis cache size (C0=250MB, C1=1GB)')
@allowed(['C0', 'C1'])
param redisSize string = 'C1'

@description('PostgreSQL admin username')
param postgresAdminUser string = 'brolonist'

@secure()
@description('PostgreSQL admin password')
param postgresAdminPassword string = newGuid()

@secure()
@description('JWT secret for authentication')
param jwtSecret string = newGuid()

@description('Minimum replicas')
param minReplicas int = 1

@description('Maximum replicas')
param maxReplicas int = 1

// ============================================================================
// AZURE CACHE FOR REDIS
// ============================================================================

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${appName}-redis'
  location: location
  properties: {
    sku: {
      name: redisSku
      family: 'C'
      capacity: int(substring(redisSize, 1, 1))
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'noeviction'
    }
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================================================
// AZURE DATABASE FOR POSTGRESQL — FLEXIBLE SERVER
// ============================================================================

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${appName}-pg'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'brolonist'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ============================================================================
// LOG ANALYTICS WORKSPACE
// ============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================================================
// CONTAINER APPS ENVIRONMENT
// ============================================================================

resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ============================================================================
// CONTAINER APP
// ============================================================================

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appName}-server'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        stickySessions: {
          affinity: 'sticky'
        }
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowCredentials: false
        }
      }
      secrets: [
        {
          name: 'redis-connection'
          value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380'
        }
        {
          name: 'database-url'
          value: 'postgresql://${postgresAdminUser}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/brolonist?sslmode=require'
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'game-server'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'REDIS_URL'
              secretRef: 'redis-connection'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '8080'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================

output appUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output redisHost string = redis.properties.hostName
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output containerAppName string = containerApp.name
