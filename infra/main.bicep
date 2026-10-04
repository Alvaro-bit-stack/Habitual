// Habitual on Azure: one Linux App Service runs server.js (web app, Gemini guides, account API),
// Azure SQL (free serverless offer) stores accounts, and Key Vault holds the Gemini key.
// No passwords anywhere: the web app reaches SQL and Key Vault with its managed identity.
targetScope = 'resourceGroup'

param location string = resourceGroup().location
@description('Short unique name; becomes <name>.azurewebsites.net')
param name string
@description('Your Entra sign-in (UPN) and object id; you become the SQL admin')
param adminLogin string
param adminObjectId string
@secure()
param geminiApiKey string
@description('App Service plan tier: F1 is free, B1 is ~$13/month with no daily CPU cap')
param planSku string = 'F1'

var tenantId = subscription().tenantId

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${name}-plan'
  location: location
  kind: 'linux'
  sku: { name: planSku }
  properties: { reserved: true }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${name}-kv'
  location: location
  properties: {
    tenantId: tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

resource geminiSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'gemini-api-key'
  properties: { value: geminiApiKey }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: '${name}-sql'
  location: location
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      azureADOnlyAuthentication: true // no SQL passwords exist
      login: adminLogin
      sid: adminObjectId
      tenantId: tenantId
      principalType: 'User'
    }
  }
}

// Lets Azure services (our web app) connect; every connection still needs an Entra identity with a database user.
resource sqlAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource db 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: 'habitual'
  location: location
  sku: { name: 'GP_S_Gen5_2', tier: 'GeneralPurpose' }
  properties: {
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause' // pauses instead of billing when the monthly free amount runs out
    autoPauseDelay: 60
    minCapacity: json('0.5')
  }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    keyVaultReferenceIdentity: 'SystemAssigned'
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server.js'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      alwaysOn: planSku != 'F1'
      appSettings: [
        { name: 'HOST', value: '0.0.0.0' }
        { name: 'TRUST_PROXY', value: '1' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
        { name: 'SQL_SERVER', value: sqlServer.properties.fullyQualifiedDomainName }
        { name: 'SQL_DATABASE', value: db.name }
        { name: 'GEMINI_API_KEY', value: '@Microsoft.KeyVault(SecretUri=${geminiSecret.properties.secretUri})' }
      ]
    }
  }
}

// Deploys use your Entra sign-in, never FTP/basic-auth passwords.
resource noFtp 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2023-12-01' = {
  parent: web
  name: 'ftp'
  properties: { allow: false }
}
resource noScmBasic 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2023-12-01' = {
  parent: web
  name: 'scm'
  properties: { allow: false }
}

// Key Vault Secrets User for the web app only.
resource kvRead 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, web.id, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: web.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output url string = 'https://${web.properties.defaultHostName}'
output sqlServer string = sqlServer.properties.fullyQualifiedDomainName
output webName string = web.name
