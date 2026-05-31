# YASC – Developer Guide

Yet Another Splitwise Clone. A fully self-hosted, open-source group expense-splitting app with web and mobile frontends.

## Project Layout

```
apps/
  api/          Go + Echo backend (port 3000 inside Docker)
  web/          Vite + React 18 SPA
  mobile/       Expo 51 + React Native (Expo Router)
packages/
  types/        Shared TypeScript domain types (@yasc/types)
  utils/        Shared utilities: formatCurrency, formatExpenseDate, CURRENCIES, split logic (@yasc/utils)
  ui/           React web component library (@yasc/ui)
  ui-native/    React Native component library (@yasc/ui-native)
infra/          Nginx config, env templates
tasks/          Original agent phase specs (historical reference)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.25 + Echo v4 + Bun ORM + PostgreSQL 16 |
| Web | Vite + React 18 + Tailwind CSS + React Query + Zustand |
| Mobile | Expo 51 + React Native 0.74 + NativeWind + React Query + Zustand |
| Monorepo | Nx 19 + pnpm workspaces |

## Running the Stack

```bash
# Start all services (api, postgres, frankfurter, nginx/web)
docker compose up -d

# Web frontend in dev mode (http://localhost:5173)
pnpm --filter @yasc/web dev

# Mobile (start Expo dev server)
pnpm --filter @yasc/mobile start

# Run all tests
pnpm test

# Run all typechecks
pnpm typecheck
```

## Environment

Copy `infra/.env.example` → `infra/.env` and `apps/api/.env.example` → `apps/api/.env` before starting.

## Key Architecture Decisions

- **Money is stored in minor units (cents).** Always divide by 100 to display; multiply by 100 to store. Use `formatCurrency(amount, currency)` from `@yasc/utils`.
- **JWT in memory only** (access token in Zustand store). Refresh token in `expo-secure-store` (mobile) or `localStorage` (web, key `rt`). The Axios interceptor in `lib/http.ts` handles 401 → refresh → retry automatically.
- **No EAS Cloud Builds** – mobile builds are done locally with Xcode/Android Studio.
- **API base path is `/api`** – Nginx proxies `/api/*` to the Go backend; the Axios client uses `baseURL: '/api'` on web. Mobile uses the `EXPO_PUBLIC_API_URL` env var.
- **Exchange rates** come from a self-hosted Frankfurter instance (ECB data). Never fetch rates directly from the client; always call the backend `/api/currency/rates`.
- **33 supported currencies** only – see `CURRENCIES` in `@yasc/utils`.
- **Debt simplification** – groups can enable `simplifyDebts`. The `/balances` endpoint returns both `balances` (raw per-user net) and `simplifiedDebts` (who owes whom). Display `simplifiedDebts` when `group.simplifyDebts = true`, otherwise display `balances`.
- **Activity metadata** – each `ActivityItem` carries a `metadata` object with rich event data (amounts, user names, changed fields). Use it to build descriptive activity strings.

## Mobile-Specific Notes

- Navigation: Expo Router (file-based). Protected routes live under `app/(tabs)/`; auth routes under `app/(auth)/`.
- Styling: NativeWind v4 (Tailwind class names on RN components). Brand color is `indigo-600` (#4f46e5).
- Toasts: Use `toast()` from `sonner-native`. The `<Toaster />` is mounted in `app/_layout.tsx`.
- Bottom sheets: `@gorhom/bottom-sheet` is available for future use.
- Date picker: `@react-native-community/datetimepicker` is available for native date pickers.
- Haptics: `expo-haptics` is available for touch feedback.

## Branch Convention

Feature branches: `feature/<name>`. Mobile parity work lives on `feature/mobile-parity`.
