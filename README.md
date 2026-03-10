# Brolonist — Online Multiplayer Catan

A web-based implementation of the classic Catan board game supporting 2–8 players.

## Tech Stack

- **Monorepo**: npm workspaces
  - `packages/shared` — Game engine, types, hex math (shared between server & client)
  - `packages/server` — Fastify backend with WebSocket
  - `packages/client` — React 19 + Vite frontend
- **Database**: PostgreSQL 16 (via Prisma) + Redis 7
- **Auth**: OAuth (Google, Discord, GitHub) + guest mode
- **Language**: Turkish (default), English

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Development

```bash
# One-command startup (Docker + migrations + server + client)
make dev

# Or manually:
docker compose up -d
npm install
npm run build -w packages/shared
npm run dev -w packages/server &
npm run dev -w packages/client &
```

- Client: http://localhost:5173
- Server: http://localhost:8080
- Health: http://localhost:8080/health

### Commands

```bash
make dev         # Start everything
make stop        # Stop everything
make build       # Build all packages
make test        # Run all tests
make typecheck   # Type check all packages
make lint        # Lint all packages
make clean       # Remove build artifacts
```

## Project Structure

```
brolonist/
├── packages/
│   ├── shared/    # Game engine + types (used by both server & client)
│   ├── server/    # Fastify backend + WebSocket + bots
│   └── client/    # React 19 + Vite + Tailwind + Storybook
├── infra/         # Azure Bicep IaC
├── .github/       # CI/CD workflows
├── docs/          # UX research, flow diagrams
└── SPECIFICATION.md
```

## License

MIT
