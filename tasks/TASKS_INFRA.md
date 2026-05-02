# Agent: Infrastructure

**Can start:** Day 1 — no dependencies on other agents.
**Owns:** Everything in `infra/`, root config files, Docker setup, CI/CD pipelines.

---

## 1. Nx Monorepo Initialisation

- [ ] Initialise Nx workspace at repo root (`npx create-nx-workspace@latest yasc --preset=ts`)
- [ ] Configure `nx.json` with project targets for `build`, `test`, `lint`, `typecheck`
- [ ] Set up `pnpm` as the package manager (`pnpm-workspace.yaml`)
- [ ] Configure `tsconfig.base.json` with path aliases for all packages
- [ ] Add `.gitignore` covering `node_modules`, `dist`, `.env`, `.nx/cache`
- [ ] Add root `package.json` with dev dependencies: TypeScript, ESLint, Prettier
- [ ] Configure ESLint with shared flat config across all apps and packages
- [ ] Configure Prettier with a shared `.prettierrc` at the root

---

## 2. Docker Compose Stack

- [ ] Create `infra/docker-compose.yml` with the following services:

### Services to define

#### `postgres`
- Image: `postgres:16-alpine`
- Persistent volume for data
- Health check
- Env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

#### `api`
- Build from `apps/api/Dockerfile`
- Depends on `postgres` (health check gated)
- Exposes port `3000` internally
- Mounts `.env` file

#### `nginx`
- Build from `apps/web/Dockerfile` (multi-stage: builds Vite app, copies `dist/` into `nginx:alpine`)
- Routes:
  - `/api/*` → proxy to `api:3000`
  - `/*` → serve static files from `/usr/share/nginx/html` (Vite `dist/`)
- Exposes port `80` and `443` externally
- No separate `web` container — static files are baked into the Nginx image

#### `mailpit` (dev only)
- Image: `axllent/mailpit`
- SMTP on port `1025`
- Web UI on port `8025`
- Used to catch all outgoing email in development

- [ ] Create `infra/docker-compose.prod.yml` override for production differences
- [ ] Create `infra/docker-compose.dev.yml` override for local development (hot reload, mailpit)

---

## 3. Nginx Configuration

- [ ] Create `infra/nginx/nginx.conf` with:
  - Upstream block for `api`
  - `location /api/` — proxy pass to `api:3000`, set proxy headers
  - `location /` — serve from `/usr/share/nginx/html`, `try_files $uri /index.html` (SPA fallback)
  - Gzip compression
  - Static asset caching headers (`Cache-Control: max-age` for hashed assets)
  - Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
  - HTTP → HTTPS redirect block (production)
  - SSL certificate path placeholders (Let's Encrypt / self-signed)

---

## 4. Dockerfiles

### `apps/api/Dockerfile`
- [ ] Multi-stage build:
  - Stage 1 `builder`: `golang:1.23-alpine`, copy source, `go build -o api ./cmd/api`
  - Stage 2 `prod`: `alpine:latest`, copy binary only, run as non-root user
  - Final image size ~15–20MB
- [ ] Run Bun migrations on container start (`./api migrate`)

### `apps/web/Dockerfile`
- [ ] Multi-stage build:
  - Stage 1 `build`: `node:20-alpine`, install deps with pnpm, run `pnpm build` (Vite)
  - Stage 2 `prod`: `nginx:alpine`, copy `dist/` from build stage to `/usr/share/nginx/html`
  - Copy `infra/nginx/nginx.conf` into the image
  - Final image size ~30–40MB (nginx:alpine + static assets)
- [ ] No Node.js runtime in production — pure static file serving

---

## 5. Environment Variable Templates

- [ ] Create `apps/api/.env.example`:
  ```
  DATABASE_URL=postgresql://user:password@postgres:5432/yasc
  JWT_SECRET=change_me
  JWT_REFRESH_SECRET=change_me
  JWT_EXPIRY=15m
  JWT_REFRESH_EXPIRY=7d
  SMTP_HOST=mailpit
  SMTP_PORT=1025
  SMTP_FROM=noreply@yasc.local
  PORT=3000
  ```

- [ ] Create `apps/web/.env.example`:
  ```
  VITE_API_URL=http://localhost/api
  ```

- [ ] Create `apps/mobile/.env.example`:
  ```
  EXPO_PUBLIC_API_URL=http://localhost/api
  ```

- [ ] Create `infra/.env.example`:
  ```
  POSTGRES_USER=yasc
  POSTGRES_PASSWORD=change_me
  POSTGRES_DB=yasc
  ```

---

## 6. Gitea (Self-hosted Git)

- [ ] Add `gitea` service to a separate `infra/docker-compose.gitea.yml`:
  - Image: `gitea/gitea:latest`
  - Persistent volume for repos and config
  - Exposes port `3000` (or `3002` to avoid conflict with API in dev)
  - SSH on port `22`
- [ ] Document setup steps in `infra/GITEA_SETUP.md`

---

## 7. Woodpecker CI

- [ ] Add `woodpecker-server` and `woodpecker-agent` services to `infra/docker-compose.gitea.yml`
- [ ] Configure Woodpecker to connect to Gitea via OAuth
- [ ] Create `.woodpecker/` pipeline directory at repo root
- [ ] Create `.woodpecker/ci.yml` pipeline with steps:
  - `install`: `pnpm install`
  - `lint`: `nx run-many --target=lint`
  - `typecheck`: `nx run-many --target=typecheck`
  - `test`: `nx run-many --target=test`
  - `build`: `nx run-many --target=build`
- [ ] Create `.woodpecker/deploy.yml` pipeline (triggered on `main` branch push):
  - SSH into server
  - Pull latest code
  - `docker compose pull && docker compose up -d`

---

## 8. Mailpit (Dev Email)

- [ ] Verify `mailpit` service in `docker-compose.dev.yml`
- [ ] Document in `infra/DEV_SETUP.md` how to access Mailpit UI (`http://localhost:8025`)

---

## 9. Developer Setup Documentation

- [ ] Create `infra/DEV_SETUP.md` covering:
  - Prerequisites (Docker, pnpm, Node 20+, Xcode for iOS, Android Studio for Android)
  - How to clone and boot the stack locally (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`)
  - How to run apps in dev mode outside Docker (for hot reload during development)
  - How to access services (API, Web, Mailpit, Postgres)
  - How to run database migrations
  - How to seed the database

- [ ] Create root `README.md` with:
  - Project description
  - Quick start guide
  - Links to `TECHSTACK.md` and `infra/DEV_SETUP.md`
