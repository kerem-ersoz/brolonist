#!/bin/bash
# Azure deployment script for Brolonist game server
# Usage: ./azure/deploy.sh [resource-group] [location]
set -e

RESOURCE_GROUP=${1:-"brolonist-rg"}
LOCATION=${2:-"eastus"}
APP_NAME="brolonist"

echo "=== Brolonist — Azure Deployment ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo ""

# Check Azure login
echo "Checking Azure CLI login..."
az account show > /dev/null 2>&1 || {
    echo "Please login first: az login"
    exit 1
}

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "Subscription: $SUBSCRIPTION"
echo ""

# Create resource group
echo "1/4 Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# Deploy Bicep template
echo "2/4 Deploying infrastructure (this takes ~15-20 min for Redis)..."
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$(dirname "$0")/main.bicep" \
    --parameters appName="$APP_NAME" \
    --query "properties.outputs" \
    --output json)

APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.appUrl.value')
REDIS_HOST=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.redisHost.value')
PG_HOST=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.postgresHost.value')
CONTAINER_APP=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.containerAppName.value')

echo ""
echo "3/4 Infrastructure deployed!"
echo "  App URL:    $APP_URL"
echo "  Redis:      $REDIS_HOST"
echo "  PostgreSQL: $PG_HOST"
echo "  Container:  $CONTAINER_APP"

echo ""
echo "4/4 Done!"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Build & push Docker image:"
echo "   docker build -t ghcr.io/kerem-ersoz/brolonist:main ."
echo "   docker push ghcr.io/kerem-ersoz/brolonist:main"
echo ""
echo "2. Update container image:"
echo "   az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --image ghcr.io/kerem-ersoz/brolonist:main"
echo ""
echo "3. Run Prisma migrations:"
echo "   DATABASE_URL=\$(az containerapp show -n $CONTAINER_APP -g $RESOURCE_GROUP --query 'properties.template.containers[0].env[?name==\`DATABASE_URL\`].value' -o tsv)"
echo "   npx -w packages/server prisma db push"
echo ""
echo "4. Set up GitHub Actions (see .github/workflows/docker-build.yml)"
echo ""
echo "5. View logs:"
echo "   az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --follow"
