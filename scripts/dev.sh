#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Auto-copy .env.example to .env if missing
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
fi

# Source env vars
set -a; source .env; set +a

echo "🐳 Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d

echo "⏳ Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-brolonist}" > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL ready"

echo "⏳ Waiting for Redis..."
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Redis ready"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building shared package..."
npm run build -w packages/shared

# TODO: Run Prisma migrations when schema is set up
# echo "🗃️ Running database migrations..."
# npx -w packages/server prisma migrate deploy

echo "🚀 Starting server..."
npm run dev -w packages/server &
SERVER_PID=$!

echo "🌐 Starting client..."
npm run dev -w packages/client &
CLIENT_PID=$!

echo ""
echo "═══════════════════════════════════════"
echo "  Brolonist dev environment running!"
echo "  Client:  http://localhost:5173"
echo "  Server:  http://localhost:8080"
echo "  Health:  http://localhost:8080/health"
echo "═══════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; docker compose down; echo 'Stopped.'" EXIT
wait
