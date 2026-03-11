#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Auto-copy .env.example to .env if missing
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
fi

# Symlink .env into packages/server for Prisma
ln -sf ../../.env packages/server/.env 2>/dev/null || true

# Source env vars so child processes inherit them
set -a; source .env; set +a

# Kill any orphaned processes from previous runs
echo "🧹 Cleaning up stale processes..."
for port in ${PORT:-8080} 5173 5174 5175; do
  kill -9 $(lsof -ti:$port) 2>/dev/null || true
done
pkill -9 -f "tsx watch.*packages/server" 2>/dev/null || true
pkill -9 -f "vite.*packages/client" 2>/dev/null || true
sleep 1

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
npm install --silent

echo "🔨 Building shared package..."
npm run build -w packages/shared

echo "🗃️  Pushing database schema..."
npx -w packages/server prisma db push --skip-generate 2>/dev/null || true
npx -w packages/server prisma generate 2>/dev/null || true

echo "🚀 Starting server..."
npm run dev -w packages/server &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server..."
for i in $(seq 1 30); do
  curl -s http://localhost:${PORT:-8080}/health > /dev/null 2>&1 && break || sleep 1
done
echo "✅ Server ready"

echo "🌐 Starting client..."
npm run dev -w packages/client &
CLIENT_PID=$!

sleep 2
# Detect actual client port (5173 may be in use)
CLIENT_PORT=$(lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep "$CLIENT_PID\|vite" | grep -oE ':[0-9]+' | head -1 | tr -d ':')
CLIENT_PORT=${CLIENT_PORT:-5173}

echo ""
echo "═══════════════════════════════════════"
echo "  🎲 Brolonist dev environment running!"
echo ""
echo "  Client:  http://localhost:${CLIENT_PORT}"
echo "  Server:  http://localhost:${PORT:-8080}"
echo "  Health:  http://localhost:${PORT:-8080}/health"
echo "═══════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services."

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  # Kill the npm parent processes
  kill $SERVER_PID $CLIENT_PID 2>/dev/null || true
  sleep 0.5
  # Kill tsx/vite child processes directly
  pkill -9 -f "tsx watch.*packages/server" 2>/dev/null || true
  pkill -9 -f "vite.*packages/client" 2>/dev/null || true
  # Force-kill anything still on our ports
  for port in ${PORT:-8080} ${CLIENT_PORT:-5173} 5174; do
    kill -9 $(lsof -ti:$port) 2>/dev/null || true
  done
  # Don't wait — processes are already killed
  echo "Stopped."
  exit 0
}
trap cleanup INT TERM

# Keep script alive while both background jobs run
wait $SERVER_PID $CLIENT_PID 2>/dev/null || true
