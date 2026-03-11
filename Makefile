.PHONY: dev stop build test test-game clean help

# One-command local dev startup
dev:
	@./scripts/dev.sh

# Stop all services
stop:
	@echo "Stopping services..."
	@docker compose down 2>/dev/null || true
	@lsof -ti:8080 | xargs kill 2>/dev/null || true
	@lsof -ti:5173 | xargs kill 2>/dev/null || true
	@lsof -ti:5174 | xargs kill 2>/dev/null || true
	@echo "All services stopped."

# Build all packages
build:
	npm run build --workspaces

# Run all tests
test:
	npm run test --workspaces

# Type check all packages
typecheck:
	npm run typecheck --workspaces

# Lint all packages
lint:
	npm run lint --workspaces

# Create a test game with bots (requires running server)
test-game:
	@echo "Test games should be created through the UI."
	@echo "  1. Open http://localhost:5173"
	@echo "  2. Login as guest"
	@echo "  3. Create a game and add bots"

# List current games
list-games:
	@curl -s http://localhost:8080/api/games | node -e "process.stdin.pipe(process.stdout)" 2>/dev/null || echo "Server not running"

# Health check
health:
	@curl -s http://localhost:8080/health

# Clean build artifacts
clean:
	@rm -rf packages/*/dist
	@rm -rf packages/client/node_modules/.vite
	@echo "Cleaned build artifacts"

# Help
help:
	@echo "Brolonist Development Commands:"
	@echo ""
	@echo "  make dev         - Start full dev environment"
	@echo "  make stop        - Stop all services"
	@echo "  make build       - Build all packages"
	@echo "  make test        - Run all tests"
	@echo "  make typecheck   - Type check all packages"
	@echo "  make lint        - Lint all packages"
	@echo "  make test-game   - Instructions for creating test game"
	@echo "  make health      - Check backend health"
	@echo "  make clean       - Remove build artifacts"
