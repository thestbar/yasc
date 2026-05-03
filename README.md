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

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/<your-org>/yasc.git && cd yasc
cp apps/api/.env.example apps/api/.env
cp infra/.env.example infra/.env

# 2. Edit .env files (change passwords and JWT secrets)

# 3. Boot the stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The app is now running at **http://localhost**.

| Service | URL |
|---------|-----|
| Web | http://localhost |
| API | http://localhost/api |
| Dev email (Mailpit) | http://localhost:8025 |

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
