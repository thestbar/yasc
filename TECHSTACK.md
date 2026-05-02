# Tech Stack Decisions

This document captures all technology choices made for this project — a free,
self-hosted Splitwise clone targeting web, iOS, and Android.

## Guiding Principles

- **100% open source** — every tool must have an OSI-approved license
- **Self-hosted** — nothing runs on a vendor's free tier; all services run on
  our own infrastructure
- **No vendor lock-in** — no dependency on any company's managed platform
  (no Vercel, Supabase, Clerk, EAS, etc.)
- **Single VPS deployable** — the entire stack runs via Docker Compose on one
  server or local machine
- **Keep it simple** — choose the simplest tool that solves the problem well

---

## Monorepo

| Decision | Choice |
|---|---|
| Tool | **Nx** |
| License | MIT |
| Remote cache | Disabled (local builds only) |
| Reason | Turborepo's remote caching is a Vercel product; Nx remote cache is self-hostable. Nx also provides better code generation tooling. |

---

## Frontend — Web

| Decision | Choice |
|---|---|
| Build tool | **Vite** |
| Framework | **React 18** |
| Routing | **React Router v6** |
| Language | TypeScript |
| License | MIT |
| Deployment | Static files served by Nginx (multi-stage Docker build) |
| Reason | Pure SPA — the app is fully authenticated with no public pages requiring SSR or SSG. Vite is simpler than Next.js: no server runtime, no file-based routing conventions, no standalone output configuration. The production build is a static `dist/` folder served directly by Nginx, eliminating the need for a separate web container. |

---

## Frontend — Mobile (iOS + Android)

| Decision | Choice |
|---|---|
| Framework | **Expo + React Native** |
| License | MIT |
| Build method | **Local builds** (Expo CLI + Xcode + Android Studio) |
| Reason | No EAS (cloud build service) dependency. Builds are triggered manually from a dev machine. |

> **Note:** iOS distribution requires an Apple Developer account ($99/year).
> Android builds are entirely free.

---

## Backend

| Decision | Choice |
|---|---|
| Language | **Go** |
| Framework | **Echo v4** |
| License | MIT |
| Reason | Go compiles to a single binary, has true concurrency via goroutines, and delivers ~10x the throughput of Node.js on the same hardware with a fraction of the memory footprint. Echo is mature, minimal, and provides clean middleware and error handling. The entire API ships as one self-contained binary inside a small Docker image. |

---

## Database

| Decision | Choice |
|---|---|
| Engine | **PostgreSQL 16** |
| License | PostgreSQL License (open source) |
| Hosting | Self-hosted via Docker |
| ORM / Query builder | **Bun** (MIT) |
| Migrations | **Bun migrator** (built-in, SQL migration files) |
| Reason | Financial/expense data is inherently relational. PostgreSQL is the gold standard for ACID-compliant relational data. Bun is a modern, fast Go ORM with a type-safe query builder, significantly faster than GORM, and includes a built-in migration runner — no extra tooling required. |

---

## Authentication

| Decision | Choice |
|---|---|
| Strategy | **Custom JWT** |
| Libraries | `golang-jwt/jwt` + `golang.org/x/crypto/bcrypt` |
| Middleware | Echo JWT middleware |
| Refresh tokens | Yes — stored in DB, rotated on use |
| Reason | No third-party auth provider. Full ownership of user credentials and sessions. |

---

## Styling

| Decision | Choice |
|---|---|
| Web | **Tailwind CSS** (MIT) |
| Mobile | **NativeWind** (MIT) |
| Reason | Consistent utility-first styling approach across both platforms. Build-time only — no runtime cloud dependency. |

---

## Infrastructure & Hosting

| Layer | Choice | License |
|---|---|---|
| Containerisation | **Docker + Docker Compose** | Apache 2.0 |
| Reverse proxy + static files | **Nginx** | BSD |
| Email (dev) | **Mailpit** (Docker) | MIT |
| Email (prod) | **Postal** (Docker) | Apache 2.0 |
| Git hosting | **GitHub** | — |
| CI/CD | **GitHub Actions** | — |
| Hosting target | Any VPS (Hetzner, OVH, Contabo) or bare metal | — |

---

## Docker Architecture

The production stack runs **two application containers** (down from three):

```
nginx       — serves Vite static files + reverse proxies /api/* to Go API
api         — Go + Echo binary
postgres    — PostgreSQL 16
frankfurter — self-hosted exchange rates
mailpit     — dev email catcher
```

The web frontend has **no runtime container**. Nginx serves the static `dist/`
output produced by a multi-stage Docker build:

```dockerfile
# Stage 1 — build Vite app
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build

# Stage 2 — serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

---

## Mobile Build Pipeline

Builds are done **locally** from a developer machine:

- **iOS:** `npx expo run:ios` — requires macOS + Xcode
- **Android:** `npx expo run:android` — requires Android Studio / Gradle

No EAS, no cloud build service. Release builds are produced manually and
submitted to the App Store / Google Play by the developer.

---

## What Was Explicitly Ruled Out

| Rejected Option | Reason |
|---|---|
| Gitea + Woodpecker CI | Self-hosted CI is meaningful ops overhead for dev tooling with no user data at stake; GitHub Actions is simpler and free |
| Vercel (hosting) | Vendor lock-in |
| Turborepo remote cache | Vercel product |
| Supabase | SaaS with free-tier limits, data not self-owned |
| Neon | Managed Postgres SaaS |
| Clerk / Auth0 | Third-party auth SaaS |
| EAS Build | Expo's paid cloud build service |
| Pusher | Paid managed WebSocket service |
| PlanetScale | Managed DB SaaS |
| Next.js | SSR not needed for a fully-authenticated SPA; Vite + React is simpler with no server runtime |
| NestJS | Replaced by Go + Echo for significantly better throughput and lower resource usage |
| Prisma | Node.js-only ORM, not applicable to Go; replaced by Bun |
| golang-migrate | Bun's built-in migrator covers all migration needs without an extra dependency |
| GORM | Slower than Bun due to heavy use of reflection; weaker type safety |
