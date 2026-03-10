#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${1:-brolonist-dev}"
LOCATION="${2:-eastus}"
SUBSCRIPTION_ID="${3:-}"

echo "🔧 Brolonist Azure Bootstrap"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"

if [ -z "$SUBSCRIPTION_ID" ]; then
  SUBSCRIPTION_ID=$(az account show --query id -o tsv)
  echo "Using current subscription: $SUBSCRIPTION_ID"
fi

echo ""
echo "Step 1: Create resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo ""
echo "Step 2: Create service principal for GitHub Actions..."
SP_NAME="brolonist-github-actions"
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth 2>/dev/null || true)

if [ -n "$SP_OUTPUT" ]; then
  echo "Service principal created."
  echo ""
  echo "Add these as GitHub repository secrets:"
  echo "  AZURE_CLIENT_ID: $(echo "$SP_OUTPUT" | jq -r .clientId)"
  echo "  AZURE_TENANT_ID: $(echo "$SP_OUTPUT" | jq -r .tenantId)"
  echo "  AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
  echo ""
  echo "Or for OIDC (recommended), configure federated credentials:"
  echo "  az ad app federated-credential create \\"
  echo "    --id \$(az ad sp show --id $SP_NAME --query appId -o tsv) \\"
  echo "    --parameters '{\"name\":\"github-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:YOUR_ORG/brolonist:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}'"
else
  echo "Service principal may already exist. Check Azure AD."
fi

echo ""
echo "✅ Bootstrap complete!"
echo "Next steps:"
echo "  1. Add GitHub secrets (see above)"
echo "  2. Run: az deployment group create --resource-group $RESOURCE_GROUP --template-file infra/azure/main.bicep --parameters infra/azure/parameters/dev.bicepparam"
