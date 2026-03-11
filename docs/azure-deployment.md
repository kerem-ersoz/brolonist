# Azure Deployment Guide

Deploy Brolonist to Azure Container Apps (same subscription/pattern as Gonul).

## Architecture

```
Resource Group: brolonist-rg (same subscription as gonul-rg)

  Container Apps (brolonist-server)  ←→  Azure Cache for Redis (brolonist-redis)
         ↕                                    Standard C1
  PostgreSQL Flexible Server         Log Analytics (brolonist-logs)
  (brolonist-pg, Burstable B1ms)

  CI/CD: GitHub Actions → GHCR → Container Apps
```

## Prerequisites

- Azure CLI: `brew install azure-cli`
- Docker installed
- `az login` (same subscription as Gonul)
- `jq` installed: `brew install jq`

## Deploy

### 1. Run the deploy script

```bash
./azure/deploy.sh brolonist-rg eastus
```

This creates: Resource Group, Redis (~15-20 min), PostgreSQL, Container Apps Environment, Log Analytics, and the Container App.

### 2. Build & push the Docker image

```bash
# Login to GHCR (use a GitHub PAT with packages:write scope)
echo $GITHUB_TOKEN | docker login ghcr.io -u kerem-ersoz --password-stdin

# Build and push
docker build -t ghcr.io/kerem-ersoz/brolonist:main .
docker push ghcr.io/kerem-ersoz/brolonist:main

# Point the Container App to the image
az containerapp update \
  --name brolonist-server \
  --resource-group brolonist-rg \
  --image ghcr.io/kerem-ersoz/brolonist:main
```

### 3. Run database migrations

```bash
# Get your app URL
APP_FQDN=$(az containerapp show -n brolonist-server -g brolonist-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "App: https://$APP_FQDN"

# Run Prisma push (get DATABASE_URL from the deployment or Azure portal)
DATABASE_URL="postgresql://brolonist:<password>@brolonist-pg.postgres.database.azure.com:5432/brolonist?sslmode=require" \
  npx -w packages/server prisma db push
```

### 4. Set up GitHub Actions CI/CD

```bash
# Create service principal
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az ad sp create-for-rbac \
  --name "brolonist-github-actions" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/brolonist-rg" \
  --sdk-auth
```

Add to GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `AZURE_CREDENTIALS` | Full JSON output from above |

After this, every push to `main` will: build Docker image → push to GHCR → deploy to Container Apps.

## Useful Commands

```bash
# View logs (live)
az containerapp logs show -n brolonist-server -g brolonist-rg --follow

# Check status
az containerapp show -n brolonist-server -g brolonist-rg \
  --query "{url:properties.configuration.ingress.fqdn, replicas:properties.runningStatus}" -o table

# Restart
az containerapp revision restart -n brolonist-server -g brolonist-rg \
  --revision $(az containerapp revision list -n brolonist-server -g brolonist-rg --query "[0].name" -o tsv)

# Scale
az containerapp update -n brolonist-server -g brolonist-rg --min-replicas 1 --max-replicas 3

# Tear down everything
az group delete --name brolonist-rg --yes --no-wait
```

## Cost (~$70-80/month)

| Resource | SKU | ~Cost |
|----------|-----|-------|
| Container Apps | 0.5 vCPU / 1GB | ~$20 |
| Redis | Standard C1 | ~$40 |
| PostgreSQL | Burstable B1ms | ~$12 |
| Log Analytics | Per-GB | ~$2 |

Use Redis Basic C0 (~$16) to reduce costs for dev/testing.
