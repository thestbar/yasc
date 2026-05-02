# Agent: Web

**Can start:** After `apps/api/openapi.json` is committed by the Backend agent.
**Owns:** Everything under `apps/web/`.
**Depends on:** `@yasc/types`, `@yasc/utils`, `@yasc/ui` from `packages/`

Stack: Vite · React 18 · React Router v6 · TypeScript · Tailwind CSS · React Query · Zustand

---

## 1. Vite + React App Scaffold

- [ ] Generate Vite + React app in `apps/web/` (`pnpm create vite web --template react-ts`)
- [ ] Configure for Nx workspace (add `project.json`, wire `build`, `dev`, `lint`, `typecheck` targets)
- [ ] Install dependencies:
  - `react-router-dom` v6 — client-side routing
  - `@tanstack/react-query` — server state / API data fetching
  - `zustand` — client-side state (auth session, UI state)
  - `axios` — HTTP client
  - `react-hook-form` + `zod` — form handling and validation
  - `dayjs` — date formatting
  - `@radix-ui/react-*` — accessible UI primitives (dialog, dropdown, tabs, etc.)
  - `lucide-react` — icon set
  - `sonner` — toast notifications
  - `clsx` + `tailwind-merge` — conditional class utilities
- [ ] Configure Tailwind CSS with shared config from `packages/ui`
- [ ] Configure `vite.config.ts`:
  - `server.proxy`: proxy `/api` to `http://localhost:3000` in dev (avoids CORS)
  - `build.outDir`: `dist`
  - `resolve.alias`: path aliases matching `tsconfig.json`
- [ ] Set up React Query provider in `main.tsx`
- [ ] Set up Zustand auth store
- [ ] Configure Axios instance with base URL from `import.meta.env.VITE_API_URL`, auto-attach JWT, handle 401 refresh
- [ ] Implement dark/light mode via a CSS class toggle on `<html>` — no library needed

---

## 2. API Client Layer

- [ ] Generate typed API client from `apps/api/openapi.json` using `openapi-typescript`
- [ ] Create `apps/web/src/lib/api/` directory with one file per resource:
  - `auth.ts` — register, login, logout, refresh, forgot/reset password
  - `users.ts` — me, search, update, delete
  - `friends.ts` — list, request, accept, decline, remove, balances
  - `groups.ts` — list, create, get, update, delete, members, join, invite
  - `expenses.ts` — list, create, get, update, delete
  - `settlements.ts` — list, create, delete
  - `currency.ts` — rates, list
  - `activity.ts` — feed
- [ ] Create custom React Query hooks for each endpoint (e.g. `useGroups`, `useGroupExpenses`)
- [ ] Handle optimistic updates for expense creation and settlement recording

---

## 3. Authentication

### Pages

- [ ] `/auth/login` — email + password form
  - Link to register and forgot password
- [ ] `/auth/register` — email, username, displayName, password, confirm password
  - Real-time username availability check (debounced)
- [ ] `/auth/forgot-password` — email input, sends reset email
- [ ] `/auth/reset-password?token=` — new password + confirm

### Auth Logic

- [ ] Store `accessToken` in memory (Zustand), `refreshToken` in `httpOnly` cookie
- [ ] Create `<ProtectedRoute>` component — wraps all authenticated routes in the React Router tree, redirects to `/auth/login` if no valid token
- [ ] Create `<GuestRoute>` component — redirects authenticated users away from `/auth/*` to `/groups`
- [ ] Implement silent token refresh on 401 response using Axios interceptor

---

## 4. App Shell & Navigation

- [ ] Define React Router route tree in `src/router.tsx`:
  ```
  /                     → redirect to /groups
  /auth/login           → Login (GuestRoute)
  /auth/register        → Register (GuestRoute)
  /auth/forgot-password → ForgotPassword (GuestRoute)
  /auth/reset-password  → ResetPassword (GuestRoute)
  /join/:inviteCode     → JoinGroup (public)
  / (ProtectedRoute)
    /groups             → GroupsList
    /groups/:id         → GroupDetail
    /groups/:id/settings → GroupSettings
    /groups/:id/expenses/new → AddExpense
    /groups/:id/expenses/:expenseId → ExpenseDetail
    /groups/:id/expenses/:expenseId/edit → EditExpense
    /friends            → FriendsList
    /friends/:id        → FriendDetail
    /activity           → ActivityFeed
    /account            → Account
  ```
- [ ] `<AppLayout>` component — renders tab bar + `<Outlet>` for all protected routes
- [ ] Tab bar shows 4 tabs: Groups, Friends, Activity, Account
- [ ] Responsive layout: sidebar nav on desktop (≥1024px), bottom tabs on mobile

---

## 5. Groups Tab (`/groups`)

### Groups List Page (`/groups`)

- [ ] List all groups the user belongs to
- [ ] Each group card shows:
  - Group name + image (or generated avatar)
  - Total balance (you owe / you are owed / settled up)
  - Date range if set
- [ ] "Create Group" button → opens create group modal/drawer
- [ ] Empty state with prompt to create first group

### Create Group Modal

- [ ] Fields: name (required), image upload, start date, end date, max members
- [ ] Default split selector
- [ ] Simplify debts toggle
- [ ] After creation: redirect to the new group page

### Group Page (`/groups/[id]`)

Mirror the Splitwise group screen layout:

- [ ] Header: group name, image, date range, settings icon
- [ ] Balance summary bar: your net balance in this group
- [ ] Member balances panel: each member, their net balance, "Settle up" shortcut
- [ ] Expense list: grouped by month, each row shows:
  - Category icon
  - Description
  - Date
  - Who paid
  - Your share (you lent / you borrowed / not involved)
- [ ] Floating "Add Expense" button
- [ ] Settlement entries interspersed in the timeline (visually distinct from expenses)
- [ ] "Settle Up" button → opens settle up flow

### Group Settings Page (`/groups/[id]/settings`)

- [ ] Section: **Group Info** — edit name, image, start/end dates, max members
- [ ] Section: **Members**
  - List all members with role badge
  - Add member (search by email or username)
  - Remove member (owner only)
  - Transfer ownership (owner only)
- [ ] Section: **Invite Link**
  - Display shareable link
  - Copy to clipboard button
  - Regenerate link button (owner only)
- [ ] Section: **Preferences**
  - Simplify group debts toggle
  - Default split type selector
- [ ] Section: **Danger Zone**
  - Leave group button (with confirmation)
  - Delete group button (owner only, with confirmation modal requiring group name input)

---

## 6. Add / Edit Expense Flow

### Add Expense Page (`/groups/[id]/expenses/new`)

Mirror the Splitwise add expense screen:

- [ ] Description input (text)
- [ ] Amount input with currency selector
  - Currency selector: searchable, sorted by most used, full ISO 4217 list
- [ ] Date picker (defaults to today)
- [ ] Category selector (icon grid)
- [ ] "Paid by" selector — which member paid (defaults to current user)
- [ ] Split type selector: Equal / Percentage / Exact / Shares
  - **Equal:** shows each member's share amount automatically
  - **Percentage:** input per member, live validation that total = 100%
  - **Exact:** input per member, live validation that total = expense amount
  - **Shares:** input shares per member, auto-calculates amounts
- [ ] Notes textarea (optional)
- [ ] Receipt image upload (optional)
- [ ] Submit saves and redirects back to group page

### Edit Expense Page (`/groups/[id]/expenses/[expenseId]/edit`)

- [ ] Pre-populated form identical to add expense
- [ ] "Delete Expense" button at bottom (with confirmation)

### Expense Detail Page (`/groups/[id]/expenses/[expenseId]`)

Mirror Splitwise expense detail:

- [ ] Full expense info: description, amount, currency, date, category, paid by
- [ ] Split breakdown: each member's share, settled status
- [ ] Notes and receipt image if present
- [ ] Edit button (pencil icon)
- [ ] Delete button
- [ ] "Added by" and timestamp

---

## 7. Settle Up Flow

- [ ] Triggered from group page "Settle Up" button or member balance row
- [ ] Shows suggested settlement (pre-filled from balance calculation)
- [ ] Fields: from user, to user, amount, currency, date, notes
- [ ] Confirm and submit

---

## 8. Currency Conversion

- [ ] Currency conversion panel on group page (collapsible)
- [ ] "View all in" selector — choose a target currency
- [ ] All amounts on the page re-render converted to the selected currency
- [ ] Rates fetched from `/api/currency/rates`
- [ ] Show disclaimer: "Approximate, based on rates from [date]"

---

## 9. Friends Tab (`/friends`)

- [ ] List of accepted friends
- [ ] Each friend row shows: avatar, name, username, net balance across all shared groups
- [ ] "Add Friend" button → search modal (by email or username)
- [ ] Pending requests section (incoming) with accept/decline buttons
- [ ] Click on friend → friend detail page

### Friend Detail Page (`/friends/[id]`)

- [ ] Net balance with this friend
- [ ] Breakdown by group: how much is owed in each shared group
- [ ] Shared expense history (read-only list)
- [ ] "Settle Up" button
- [ ] "Remove Friend" button

---

## 10. Activity Tab (`/activity`)

- [ ] Paginated feed of all activity across all groups
- [ ] Filter by group (dropdown)
- [ ] Each item shows: actor avatar, description, group name, relative timestamp
- [ ] Activity types rendered distinctly:
  - Expense added/edited/deleted
  - Settlement recorded
  - Member joined/left group
  - Group created/updated
- [ ] "Load more" pagination

---

## 11. Account Tab (`/account`)

- [ ] Avatar + display name + username + email
- [ ] "Edit Profile" section: update display name, avatar upload
- [ ] "Change Password" section
- [ ] "Default Currency" preference (stored in user profile)
- [ ] Dark / Light mode toggle (toggles `.dark` class on `<html>`, persisted in `localStorage`)
- [ ] "Delete Account" (danger zone, confirmation required)
- [ ] "Log Out" button

---

## 12. Join Group via Invite Link

- [ ] `/join/:inviteCode` — public page
  - Shows group preview: name, image, member count
  - "Join Group" button (prompts login if unauthenticated, then joins)
  - Redirects to group page after joining

---

## 13. Error Handling & UX Polish

- [ ] Global error boundary
- [ ] 404 and 500 error pages
- [ ] Skeleton loaders for all data-fetching pages
- [ ] Optimistic UI for expense creation (expense appears immediately, rolls back on error)
- [ ] Toast notifications for all success/error actions
- [ ] Form validation with inline error messages (react-hook-form + zod)
- [ ] Confirm dialogs for all destructive actions

---

## 14. Testing

- [ ] Unit tests for all utility hooks and helper functions
- [ ] Component tests with React Testing Library for critical flows (login, add expense)
- [ ] E2E test stubs with Playwright for: register → create group → add expense → settle up
