#!/usr/bin/env bash
# Build Habitual and ship it to Azure App Service. Needs: az login, python3, node 22+, zip.
#   infra/deploy.sh <app-name> [region] [sql-region]   first run creates everything, later runs just redeploy
# The Gemini key is read from .env (never printed, never committed) and stored in Key Vault.
set -euo pipefail
export PATH="$HOME/.azure-cli-venv/bin:$PATH"
export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python -c 'import certifi;print(certifi.where())' 2>/dev/null)}"
NAME=${1:?usage: infra/deploy.sh <app-name> [region] [sql-region]}
LOCATION=${2:-eastus2}
SQL_LOCATION=${3:-$LOCATION}
RG="$NAME-rg"
cd "$(dirname "$0")/.."

az account show >/dev/null || { echo "Run: az login"; exit 1; }
KEY=$( (grep -E '^GEMINI_API_KEY=' .env 2>/dev/null || true) | head -1 | cut -d= -f2- | tr -d '"'"'")
[ -n "$KEY" ] || echo "No GEMINI_API_KEY in .env: deploying with Gemini features off"

echo "== Resources ($RG in $LOCATION)"
az group create -n "$RG" -l "$LOCATION" -o none
ME=$(az ad signed-in-user show --query "{upn:userPrincipalName,id:id}" -o tsv)
SECRETS=$(mktemp) && chmod 600 "$SECRETS"
KEY="$KEY" node -e 'process.stdout.write(JSON.stringify({geminiApiKey:{value:process.env.KEY}}))' > "$SECRETS"
az deployment group create -g "$RG" -f infra/main.bicep -o none \
  -p name="$NAME" sqlLocation="$SQL_LOCATION" adminLogin="$(cut -f1 <<<"$ME")" adminObjectId="$(cut -f2 <<<"$ME")" -p @"$SECRETS"
rm -f "$SECRETS"
SQL=$(az sql server show -g "$RG" -n "$NAME-db" --query fullyQualifiedDomainName -o tsv)

echo "== Database schema and app access (temporary firewall opening for this Mac)"
IP=$(curl -fsS https://api.ipify.org)
az sql server firewall-rule create -g "$RG" -s "$NAME-db" -n deploy-temp --start-ip-address "$IP" --end-ip-address "$IP" -o none
trap 'az sql server firewall-rule delete -g "$RG" -s "$NAME-db" -n deploy-temp -o none 2>/dev/null || true' EXIT
(cd backend && npm ci --omit=dev --silent && SQL_SERVER="$SQL" SQL_DATABASE=habitual APP_IDENTITY="$NAME" node src/migrate.js)

echo "== Package and deploy"
python3 build.py >/dev/null
PKG=$(mktemp -d)/habitual.zip
zip -qr "$PKG" server.js dist assets/hobbies backend/package.json backend/src backend/node_modules -x '*.DS_Store' 'dist/preview.html' 'dist/sidequest.html' 'dist/cloud-config.json'
az webapp deploy -g "$RG" -n "$NAME" --src-path "$PKG" --type zip -o none
rm -f "$PKG"

URL="https://$(az webapp show -g "$RG" -n "$NAME" --query defaultHostName -o tsv)"
echo "== Live at $URL"
curl -fsS "$URL/api/health" && echo
