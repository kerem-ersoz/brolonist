param name string
param location string
param administratorLogin string

@secure()
param administratorPassword string = newGuid()

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: name
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: { storageSizeGB: 32 }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgres
  name: 'brolonist'
}

output connectionString string = 'postgresql://${administratorLogin}:${administratorPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/brolonist?sslmode=require'
