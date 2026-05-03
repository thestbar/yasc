# YASC — Yet Another Splitwise Clone

A fully self-hosted, open-source expense-splitting app for web, iOS, and Android. No external services required — the entire stack runs via `docker compose up` on a single server.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Echo v4, PostgreSQL 16, Bun ORM |
| Web | Vite + React 18 SPA, Tailwind CSS |
| Mobile | Expo + React Native, NativeWind |
| Infra | Docker Compose, Nginx, Frankfurter (exchange rates), Mailpit (dev email) |
| CI/CD | GitHub Actions |

## Quick Start (Docker)

```bash
# 1. Clone and configure
git clone https://github.com/<your-org>/yasc.git && cd yasc
cp apps/api/.env.example apps/api/.env

# 2. Edit apps/api/.env — change JWT_SECRET and JWT_REFRESH_SECRET at minimum

# 3. Boot the full stack (API + Postgres + Nginx + Mailpit + Frankfurter)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The app is now running at **http://localhost**.

| Service | URL |
|---------|-----|
| Web | http://localhost |
| API | http://localhost/api |
| Dev email (Mailpit) | http://localhost:8025 |

## Local Development Setup

For iterating on the backend or frontend without rebuilding Docker images every time.

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | 24+ | [OrbStack](https://orbstack.dev) (Mac) or Docker Desktop |
| Go | 1.25+ | `brew install go` |
| Node.js | 20+ | `brew install node` |
| pnpm | 9+ | `npm install -g pnpm` |

### 1. Start backing services (Postgres, Mailpit, Frankfurter)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres mailpit frankfurter -d
```

> **Port conflict:** If you already have PostgreSQL running locally on port 5432, `docker-compose.dev.yml` maps the Docker Postgres to port **5433** instead. The `apps/api/.env` is already configured to use port 5433 for local dev.

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env   # if you haven't already
```

`apps/api/.env` defaults that work out of the box for local dev:

```
DATABASE_URL=postgresql://yasc:changeme@localhost:5433/yasc?sslmode=disable
JWT_SECRET=change_me_to_a_long_random_string
JWT_REFRESH_SECRET=change_me_to_another_long_random_string
SMTP_HOST=localhost
SMTP_PORT=1025
PORT=3000
APP_ENV=development
FRANKFURTER_URL=http://localhost:8080
```

Generate proper secrets for anything non-throwaway: `openssl rand -hex 32`

### 3. Run the API

```bash
cd apps/api
go run ./cmd/api
# API is live at http://localhost:3000
```

Migrations run automatically on startup. To seed demo data:

```bash
go run ./cmd/api seed
```

### 4. Run the web frontend

```bash
pnpm install       # from repo root, first time only
pnpm --filter @yasc/web dev
# Opens at http://localhost:5173, proxies /api/* to the running API
```

### 5. Run the mobile app

```bash
pnpm --filter @yasc/mobile start
# Press 'i' for iOS simulator, 'a' for Android emulator
```

### Useful commands

```bash
# Rebuild just the API Docker image after code changes
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build api

# Tail API logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api

# Reset the database (destroys all data)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Connect to Postgres directly
docker compose exec postgres psql -U yasc -d yasc

# Run all tests
cd apps/api && go test ./...
pnpm nx run-many --target=test
```

## Architecture

```
Browser / Mobile App
        │
        ▼
   ┌─────────┐
   │  Nginx  │  :80/:443  static files + /api/* reverse proxy
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │  Go API │  :3000  Echo v4
   └────┬────┘
        │
   ┌────┴───────────────┐
   │                    │
   ▼                    ▼
┌──────────┐    ┌──────────────┐
│ Postgres │    │ Frankfurter  │
│  :5432   │    │  :8080 (ECB) │
└──────────┘    └──────────────┘
```

The web frontend has **no runtime container**. Nginx serves the static `dist/` output from a multi-stage Docker build.

## Documentation

- [Tech Stack Decisions](TECHSTACK.md)
- [Developer Setup Guide](infra/DEV_SETUP.md)

## Guiding Principles

- **100% open source** — every runtime dependency has an OSI-approved license
- **Self-hosted** — user data never touches a managed SaaS platform
- **Single server** — runs entirely on one VPS or local machine via Docker Compose
