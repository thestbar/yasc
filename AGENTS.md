# AGENTS — Master Coordinator

This file is the single source of truth for all agent activity. Every agent
must read this file before starting work and update their status section as
they progress. No agent should begin a phase without confirming the phase gate
conditions below are met.

---

## Agent Registry

| ID | Agent | Task File | Phase | Status |
|---|---|---|---|---|
| A | Infra | `tasks/TASKS_INFRA.md` | 1 | `DONE` |
| B | Shared Packages | `tasks/TASKS_SHARED.md` | 1 | `DONE` |
| C | Backend | `tasks/TASKS_BACKEND.md` | 2 | `DONE` |
| D | Web | `tasks/TASKS_WEB.md` | 3 | `PENDING` |
| E | Mobile | `tasks/TASKS_MOBILE.md` | 3 | `PENDING` |

**Status values:** `PENDING` · `IN PROGRESS` · `BLOCKED` · `DONE`

---

## Dependency Map

```
Phase 1 (parallel)
├── Agent A: Infra ─────────────────────────────────────────────► DONE
└── Agent B: Shared Packages ───────────────────────────────────► DONE
                                        │
                                        ▼ Phase Gate 1
Phase 2
└── Agent C: Backend ───────────────────────────────────────────► DONE
                                        │
                                        ▼ Phase Gate 2
Phase 3 (parallel)
├── Agent D: Web ───────────────────────────────────────────────► DONE
└── Agent E: Mobile ───────────────────────────────────────────► DONE
```

---

## Phase Gates

A phase gate is a hard stop. No agent may begin a later phase until ALL
conditions for that gate are verified and checked off below.

### Phase Gate 1 — Unlocks: Agent C (Backend)

- [x] `nx.json` exists at repo root
- [x] `packages/types/src/index.ts` exports all domain interfaces
- [x] `packages/utils/src/index.ts` exports all split calculation functions
- [x] `tsconfig.base.json` path aliases are configured for all packages
- [x] `pnpm install` runs successfully from repo root
- [x] **Signed off by:** Agent B (Shared Packages)

### Phase Gate 2 — Unlocks: Agent D (Web) and Agent E (Mobile)

- [x] `apps/api/openapi.json` exists and is committed to the repo
- [x] All auth endpoints are implemented and tested (`/api/auth/*`)
- [x] All group endpoints are implemented and tested (`/api/groups/*`)
- [x] All expense endpoints are implemented and tested
- [x] All settlement endpoints are implemented and tested
- [x] `docker compose up` boots the API and connects to Postgres successfully
- [x] **Signed off by:** Agent C (Backend)

---

## Execution Phases

### Phase 1 — Foundations (Agents A + B run in parallel)

**Goal:** Stand up the full infrastructure and scaffold all shared code that
the rest of the system depends on.

**Agent A — Infra:**
- Initialise the Nx monorepo at repo root
- Set up Docker Compose with all services (see service list below)
- Write Nginx config, Dockerfiles, env templates, Woodpecker CI pipelines
- Write developer setup documentation

**Agent B — Shared Packages:**
- Scaffold all four Nx packages (`types`, `utils`, `ui`, `ui-native`)
- Define all TypeScript domain interfaces
- Implement and unit-test the split calculation engine
- Implement currency formatting and conversion utilities
- Build shared primitive components for web and mobile

**Phase 1 is complete when both agents set their status to `DONE` and Phase
Gate 1 is fully checked off.**

---

### Phase 2 — Backend (Agent C runs alone)

**Goal:** Implement the full API and database schema.
Produce the OpenAPI spec that unblocks all frontend work.

**Agent C — Backend:**
- Define the complete Bun models and run initial migration
- Implement all Go handlers (Auth, Users, Friends, Groups, Expenses,
  Settlements, Currency, Activity)
- Generate and commit `apps/api/openapi.json`
- Seed the database with demo data

> **Priority within this phase:** Auth and Groups endpoints first, then
> Expenses and Settlements, then Currency and Activity. This allows frontend
> agents to start work on core screens while remaining endpoints are built.

**Phase 2 is complete when Agent C sets status to `DONE` and Phase Gate 2 is
fully checked off.**

---

### Phase 3 — Frontend (Agents D + E run in parallel)

**Goal:** Build the full web and mobile applications against the committed
API contract.

**Agent D — Web** and **Agent E — Mobile** work simultaneously. They share
the same backend and the same `packages/` code but own entirely separate
application directories (`apps/web/` and `apps/mobile/`).

**Recommended implementation order within each agent:**

1. API client layer + auth screens (unblocks everything else)
2. Groups list + group detail screen
3. Add expense flow
4. Friends tab
5. Activity tab
6. Account tab
7. Settings screens
8. Invite link flow
9. Currency conversion UI
10. Polish, error handling, loading states, tests

**Phase 3 is complete when both agents set their status to `DONE` and the MVP
definition checklist at the bottom of this file is fully checked off.**

---

## Docker Compose Services

All agents must be aware of the full service topology:

| Service | Image / Source | Internal Host | Port | Notes |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `postgres` | `5432` | Primary database |
| `frankfurter` | `ghcr.io/hakanensari/frankfurter` | `frankfurter` | `8080` | Self-hosted exchange rates |
| `api` | `apps/api/Dockerfile` | `api` | `3000` | Go + Echo backend |
| `nginx` | `apps/web/Dockerfile` (multi-stage) | — | `80`, `443` | Reverse proxy + serves Vite static files |
| `mailpit` | `axllent/mailpit` | `mailpit` | `1025` (SMTP), `8025` (UI) | Dev email catcher |

> **Note:** There is no separate `web` container. The Vite build is compiled
> in a multi-stage Docker build and the resulting static files are copied
> directly into the `nginx` image. Nginx serves the frontend and proxies API
> requests to the `api` container.

### Nginx Routing

```
/api/*    → proxy to api:3000
/*        → serve static files from /usr/share/nginx/html (Vite dist/)
```

---

## Currency Rate Update Strategy

Exchange rates are provided by a **self-hosted Frankfurter instance** running
as a Docker service. This means the application has zero dependency on any
external service at runtime.

### How it works

```
ECB publishes rates once per business day (~4pm CET)
  └─► Frankfurter container fetches automatically (built-in scheduler)
        └─► Go cron job runs daily at 5pm CET (robfig/cron)
              └─► Calls http://frankfurter:8080/latest for each base currency
                    └─► Upserts rates into ExchangeRate table in Postgres
                          └─► All client requests read from Postgres (fast)
```

### Fallback behaviour

If the scheduled job has not yet run (e.g. first boot), the API fetches from
`http://frankfurter:8080` on the first inbound client request and caches the
result. Subsequent requests read from Postgres.

### Known limitation

Frankfurter / ECB covers ~33 major fiat currencies (USD, EUR, GBP, JPY, CAD,
AUD, CHF, CNY, and others). Exotic currencies and cryptocurrencies are not
supported. This is an acceptable limitation for the MVP.

### Responsibilities

- **Agent A (Infra):** Add `frankfurter` service to `docker-compose.yml`
- **Agent C (Backend):** Implement currency handler with the cron job,
  `ExchangeRate` Bun model, and the `/api/currency/rates` endpoint
- **Agent D (Web) + Agent E (Mobile):** Fetch rates from `/api/currency/rates`,
  pass them to `convertAmount()` from `@yasc/utils` — never call Frankfurter directly

---

## Shared Conventions

All agents must follow these conventions to avoid conflicts.

### Branch Naming

```
agent/infra
agent/shared
agent/backend
agent/web
agent/mobile
```

Each agent works exclusively on their branch. Merges to `main` happen at the
end of each phase after review.

### Commit Message Format

```
<scope>(<area>): <short description>

Examples:
infra(docker): add frankfurter service to compose file
backend(auth): implement JWT refresh token rotation
web(groups): build group detail screen
mobile(expenses): implement add expense bottom sheet
shared(utils): add simplifyDebts algorithm
```

### File Ownership

Agents must not edit files outside their owned directory unless explicitly
listed below as shared:

| Agent | Owns | May also edit |
|---|---|---|
| A (Infra) | `infra/`, `docker-compose*.yml`, `.woodpecker/` | Root `nx.json`, root `package.json`, `README.md` |
| B (Shared) | `packages/` | Root `tsconfig.base.json`, `nx.json` |
| C (Backend) | `apps/api/` | `apps/api/openapi.json` |
| D (Web) | `apps/web/` | Nothing outside |
| E (Mobile) | `apps/mobile/` | Nothing outside |

### Reporting a Blocker

If an agent is blocked, they must:
1. Set their status in the Agent Registry to `BLOCKED`
2. Append an entry to the Progress Log below with prefix `[BLOCKED]`
3. Describe exactly what is missing and which agent/file/decision unblocks them

---

## Inter-Agent Communication Protocol

Agents do not communicate in real time. They communicate through this file and
through committed code. The protocol is:

1. **Read** this file before starting any session
2. **Check** the phase gate conditions before beginning phase work
3. **Update** your status in the Agent Registry when it changes
4. **Log** every significant milestone in the Progress Log
5. **Commit** phase gate artifacts (e.g. `openapi.json`) with a clear commit
   message so other agents can detect them via git log

---

## Progress Log

Agents append to this log chronologically. Do not edit existing entries.
Format: `[AGENT] [STATUS] [DATE] — Description`

```
[A] [DONE] 2026-05-02 — Nx monorepo scaffold complete. Docker Compose (postgres, api, nginx, frankfurter, mailpit), Nginx config, multi-stage Dockerfiles, GitHub Actions CI/deploy workflows, env templates, and dev docs written.
[B] [DONE] 2026-05-03 — All four packages scaffolded. types: all domain interfaces. utils: split engine + debt simplification + currency + date + validation, 61 tests passing. ui: 13 web components. ui-native: 12 mobile components + BottomSheet + SectionListWrapper. Phase Gate 1 fully checked off.
[C] [DONE] 2026-05-03 — Full Go backend: Echo v4, Bun ORM, 8 handler groups (auth, users, friends, groups, expenses, settlements, currency, activity), migrations, seed script, 16 service tests passing. Phase Gate 2 signed off.
[D] [DONE] YYYY-MM-DD — All web screens complete. MVP checklist items verified.
[E] [DONE] YYYY-MM-DD — All mobile screens complete. MVP checklist items verified.
```

*(Replace placeholders with actual dates and descriptions as work is completed)*

---

## Cross-Cutting Decisions

Decisions that affect multiple agents. All agents must read and respect these.

| # | Decision | Affects | Detail |
|---|---|---|---|
| 1 | Money is stored as **integer minor units** (cents) | B, C, D, E | `$10.50` is stored as `1050`. All display formatting goes through `formatCurrency()` from `@yasc/utils`. Never store floats for money. |
| 2 | Dates are stored and transmitted as **ISO 8601 strings** | C, D, E | e.g. `"2024-04-28T14:00:00Z"`. The API never returns Unix timestamps. |
| 3 | Currency codes are **ISO 4217** | C, D, E | e.g. `"USD"`, `"EUR"`. Three uppercase letters. |
| 4 | Exchange rates are **never fetched client-side** | D, E | Web and mobile always call `/api/currency/rates`. They never call Frankfurter directly. |
| 5 | JWT access token stored **in memory only** | D, E | Never in localStorage. Refresh token in httpOnly cookie (web) or expo-secure-store (mobile). |
| 6 | All API routes are **prefixed `/api`** | C, D, E | Nginx routes `/api/*` to the backend. Web fetches use this prefix. |
| 7 | Usernames are **3–20 chars, alphanumeric + underscores** | B, C, D, E | Validated in `@yasc/utils` `isValidUsername()`. Both API and clients validate. |
| 8 | Split amounts must **always sum exactly to the expense total** | B, C | Enforced in `@yasc/utils` and re-validated in the API before persisting. |
| 9 | Frankfurter covers **~33 major currencies only** | C, D, E | If a group uses a currency not in the ECB list, conversion is unavailable and the UI must handle this gracefully (show original amount, no conversion). |

---

## MVP Definition Checklist

The MVP is complete when every item below is checked:

### Auth
- [ ] User can register with email, username, display name, password
- [ ] One email maps to at most one account (enforced)
- [ ] Usernames are unique across the platform
- [ ] User can log in and receive JWT tokens
- [ ] User can reset their password via email

### Friends
- [ ] User can search for other users by email or username
- [ ] User can send, accept, and decline friend requests
- [ ] User can see net balance with each friend across all shared groups

### Groups
- [ ] User can create a group with name (required), image, dates, max members
- [ ] User can add members by email or username
- [ ] Friends are surfaced as suggestions when creating a group
- [ ] User can generate a shareable invite link for a group
- [ ] Anyone with the link can join the group (subject to max members)
- [ ] Group settings: edit info, manage members, regenerate link, toggle simplify debts, set default split
- [ ] Only the group creator can delete the group
- [ ] Max members cap is enforced and configurable via settings

### Expenses
- [ ] User can add an expense with description, amount, currency, date, category
- [ ] All ISO 4217 currencies are selectable, sorted by most used, searchable
- [ ] Supported split types: equal, percentage, exact, shares
- [ ] Splits always sum to the expense total (validated)
- [ ] User can edit and delete expenses

### Settlements
- [ ] User can record a payment (settle up) between two group members
- [ ] Settlement appears in the group timeline

### Balances & Currency
- [ ] Per-member balances are calculated correctly for each group
- [ ] Simplified debt mode reduces the number of transactions required
- [ ] User can convert all group amounts to a single currency
- [ ] Exchange rates update daily via self-hosted Frankfurter

### Activity
- [ ] Activity feed shows all events across all groups
- [ ] Feed is filterable by group

### Tabs
- [ ] All 4 tabs functional on web: Groups, Friends, Activity, Account
- [ ] All 4 tabs functional on mobile: Groups, Friends, Activity, Account

### Infrastructure
- [ ] Full stack boots with `docker compose up` on a single server
- [ ] No dependency on any external managed service
- [ ] CI pipeline runs lint, typecheck, tests on every push
