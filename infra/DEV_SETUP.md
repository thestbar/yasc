# Developer Setup Guide

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Docker + Docker Compose | 24+ | Running the full stack |
| pnpm | 9+ | JavaScript package manager |
| Node.js | 20+ | Frontend + shared packages |
| Go | 1.25+ | Backend API (for local dev) |
| Xcode | Latest | iOS simulator (macOS only) |
| Android Studio | Latest | Android emulator |

## 1. Clone and Configure

```bash
git clone https://github.com/<your-org>/yasc.git
cd yasc

# Copy and fill in environment files
cp apps/api/.env.example apps/api/.env
cp infra/.env.example infra/.env
```

Key values to change in `apps/api/.env`:
- `JWT_SECRET` — long random string (e.g. `openssl rand -hex 32`)
- `JWT_REFRESH_SECRET` — a different long random string
- `POSTGRES_PASSWORD` — match what you set in `infra/.env`

## 2. Boot the Full Stack

```bash
# Development (includes Mailpit for email testing)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Detached
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## 3. Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| Web app | http://localhost | Vite SPA served by Nginx |
| API | http://localhost/api | Go + Echo, proxied by Nginx |
| API (direct) | http://localhost:3000 | When running Go outside Docker |
| Mailpit UI | http://localhost:8025 | Catches all outbound emails in dev |
| PostgreSQL | localhost:5432 | User: `yasc`, DB: `yasc` |

## 4. Running in Dev Mode (Hot Reload)

For faster iteration, run services outside Docker:

### API (Go)
```bash
cd apps/api
# Edit DATABASE_URL to point to localhost:5432
go run ./cmd/api
```

### Web (Vite)
```bash
pnpm install
pnpm --filter @yasc/web dev
# Opens at http://localhost:5173, proxies /api/* to localhost:3000
```

### Mobile (Expo)
```bash
pnpm --filter @yasc/mobile start
# Press 'i' for iOS simulator, 'a' for Android emulator
```

## 5. Database

Migrations run automatically when the API starts.

```bash
# Seed demo data
docker compose exec api ./api seed

# Connect to Postgres directly
docker compose exec postgres psql -U yasc -d yasc

# Reset the database (destroys all data)
docker compose down -v && docker compose up -d postgres
```

## 6. Running Tests

```bash
# All JS/TS packages
pnpm nx run-many --target=test

# Single package
pnpm nx test @yasc/utils

# Go API
cd apps/api && go test ./...
```

## 7. Useful Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f nginx

# Rebuild a service after code changes
docker compose up --build api

# Stop everything
docker compose down
```
