# Tasks Overview

This document describes the agent execution plan for building the YASC MVP
(Yet Another Splitwise Clone). All detailed task lists live in sibling files
within this `tasks/` directory.

---

## Agent Roster

| Agent | File | Can start |
|---|---|---|
| **Infra** | `TASKS_INFRA.md` | Day 1 — no dependencies |
| **Shared Packages** | `TASKS_SHARED.md` | Day 1 — no dependencies |
| **Backend** | `TASKS_BACKEND.md` | After shared packages scaffold is done |
| **Web** | `TASKS_WEB.md` | After backend publishes OpenAPI spec |
| **Mobile** | `TASKS_MOBILE.md` | After backend publishes OpenAPI spec |

---

## Execution Order

```
Phase 1 — Parallel (no dependencies)
├── Agent: Infra
│     Sets up the entire Docker Compose stack, Nginx, CI/CD, env templates.
│     Completely independent of product code.
│
└── Agent: Shared Packages
      Scaffolds the Nx monorepo and creates all shared packages:
      TypeScript domain types, split calculation engine, currency utils,
      shared Tailwind config, shared UI primitives.

Phase 2 — Sequential (depends on Phase 1)
└── Agent: Backend
      Requires: Nx monorepo scaffold + shared types from Phase 1.
      Builds all Bun models and migrations, Go handlers, REST endpoints,
      and outputs an OpenAPI spec file.

Phase 3 — Parallel (depends on Phase 2 OpenAPI spec)
├── Agent: Web
│     Requires: OpenAPI spec from Backend agent.
│     Builds all Next.js pages and features.
│
└── Agent: Mobile
      Requires: OpenAPI spec from Backend agent.
      Builds all Expo screens and features.
```

---

## Monorepo Structure

```
yasc/
├── apps/
│   ├── api/               # Go + Echo backend
│   ├── web/               # Vite + React SPA
│   └── mobile/            # Expo React Native app
├── packages/
│   ├── types/             # Shared TypeScript domain interfaces
│   ├── utils/             # Split calculation + currency conversion logic
│   ├── ui/                # Shared React web components
│   └── ui-native/         # Shared React Native components
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── woodpecker/
├── tasks/                 # This directory
├── TECHSTACK.md
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## API Contract Convention

The Backend agent must output an OpenAPI 3.1 spec at:

```
apps/api/openapi.json
```

This file is the contract that Web and Mobile agents code against. It must be
committed before Web and Mobile agents begin feature implementation.

---

## Environment Variables

All services read from `.env` files. The Infra agent creates `.env.example`
templates for each app. Developers copy and fill them in locally.

| File | Used by |
|---|---|
| `apps/api/.env` | Go API |
| `apps/web/.env` | Vite + React web |
| `apps/mobile/.env` | Expo mobile |
| `infra/.env` | Docker Compose |

---

## Definition of MVP Done

The MVP is complete when:

- [ ] A user can register and log in on web and mobile
- [ ] A user can add friends by email or username
- [ ] A user can create a group, invite members via link or search
- [ ] A user can add an expense to a group with any split type
- [ ] Balances are calculated correctly and shown on the group screen
- [ ] A user can record a settlement (payment) between two members
- [ ] The activity feed shows all actions across all groups
- [ ] All 4 tabs are functional on both web and mobile
- [ ] The full stack runs via `docker compose up` on a single server
