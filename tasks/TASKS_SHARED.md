# Agent: Shared Packages

**Can start:** Day 1 — no dependencies on other agents.
**Owns:** Everything under `packages/`. These packages are consumed by `apps/api`,
`apps/web`, and `apps/mobile`.

> The most critical output of this agent is `packages/types` and `packages/utils`.
> The Backend agent cannot start until these two packages are scaffolded with at
> least their base interfaces and function signatures (implementations can be
> refined later).

---

## 1. Nx Package Scaffolding

- [ ] Generate `packages/types` as an Nx library (`nx g @nx/js:lib types`)
- [ ] Generate `packages/utils` as an Nx library (`nx g @nx/js:lib utils`)
- [ ] Generate `packages/ui` as an Nx React library (`nx g @nx/react:lib ui`)
- [ ] Generate `packages/ui-native` as an Nx library (`nx g @nx/js:lib ui-native`)
- [ ] Ensure all packages export from a single `index.ts` barrel file
- [ ] Configure path aliases in root `tsconfig.base.json`:
  ```json
  "@yasc/types": ["packages/types/src/index.ts"],
  "@yasc/utils": ["packages/utils/src/index.ts"],
  "@yasc/ui": ["packages/ui/src/index.ts"],
  "@yasc/ui-native": ["packages/ui-native/src/index.ts"]
  ```

---

## 2. `packages/types` — Domain Interfaces

Define all shared TypeScript interfaces that map 1:1 to the API response shapes.
These types are used by the API (Prisma DTOs), web, and mobile.

### User

```ts
interface User {
  id: string
  email: string
  username: string          // unique, used as display identity
  displayName: string
  avatarUrl: string | null
  createdAt: string         // ISO 8601
}
```

### Friend

```ts
interface Friendship {
  id: string
  user: User
  friend: User
  status: 'pending' | 'accepted'
  createdAt: string
}
```

### Group

```ts
interface Group {
  id: string
  name: string
  imageUrl: string | null
  startDate: string | null  // ISO 8601 date
  endDate: string | null
  maxMembers: number | null
  simplifyDebts: boolean
  defaultSplit: SplitType
  inviteCode: string        // UUID used to generate shareable link
  createdById: string
  createdAt: string
  updatedAt: string
}

interface GroupMember {
  id: string
  groupId: string
  user: User
  joinedAt: string
  role: 'owner' | 'member'
}
```

### Expense

```ts
interface Expense {
  id: string
  groupId: string
  description: string
  amount: number            // stored in minor units (cents)
  currency: string          // ISO 4217 code e.g. "USD"
  date: string              // ISO 8601
  category: ExpenseCategory
  paidById: string
  paidBy: User
  splitType: SplitType
  splits: ExpenseSplit[]
  receiptUrl: string | null
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

interface ExpenseSplit {
  id: string
  expenseId: string
  user: User
  amount: number            // amount owed by this user in minor units
  percentage: number | null // used when splitType is 'percentage'
  shares: number | null     // used when splitType is 'shares'
  settled: boolean
}
```

### Settlement

```ts
interface Settlement {
  id: string
  groupId: string
  fromUser: User
  toUser: User
  amount: number
  currency: string
  date: string
  notes: string | null
  createdAt: string
}
```

### Activity

```ts
interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actor: User
  groupId: string | null
  group: Pick<Group, 'id' | 'name'> | null
  expenseId: string | null
  settlementId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}
```

### Enums

- [ ] Define `SplitType` enum: `'equal' | 'percentage' | 'exact' | 'shares'`
- [ ] Define `ExpenseCategory` enum:
  `'general' | 'food' | 'transport' | 'accommodation' | 'entertainment' | 'utilities' | 'shopping' | 'health' | 'other'`
- [ ] Define `ActivityType` enum:
  `'expense_added' | 'expense_updated' | 'expense_deleted' | 'settlement_recorded' | 'member_joined' | 'member_left' | 'group_created' | 'group_updated'`

### API Response wrappers

- [ ] Define `PaginatedResponse<T>` interface
- [ ] Define `ApiError` interface (`{ statusCode, message, errors? }`)

---

## 3. `packages/utils` — Business Logic

### Split Calculation Engine

This is the most critical utility. It must be pure functions with no side effects,
fully unit tested.

- [ ] `calculateEqualSplit(totalAmount: number, memberCount: number): number[]`
  - Handles remainder distribution (e.g. $10 / 3 people → [334, 333, 333] cents)

- [ ] `calculatePercentageSplit(totalAmount: number, percentages: number[]): number[]`
  - Validates percentages sum to 100
  - Handles rounding

- [ ] `calculateExactSplit(totalAmount: number, amounts: number[]): ValidationResult`
  - Validates amounts sum to totalAmount

- [ ] `calculateSharesSplit(totalAmount: number, shares: number[]): number[]`
  - Converts shares to amounts

- [ ] `simplifyDebts(balances: DebtGraph): SimplifiedDebt[]`
  - Implements the minimum transactions debt simplification algorithm
  - Input: a map of `{ fromUserId, toUserId, amount }` pairs
  - Output: a minimal list of transactions that settles all debts

- [ ] `calculateGroupBalances(expenses: Expense[], settlements: Settlement[]): Balance[]`
  - Returns net balance per user in the group

### Currency Utilities

- [ ] Define `CURRENCIES` constant: full list of ISO 4217 currencies with code, name, symbol
- [ ] Sort currencies by most commonly used (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY first)
- [ ] `formatCurrency(amountInMinorUnits: number, currencyCode: string): string`
- [ ] `convertAmount(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number`
  - Exchange rates are passed in (fetched by the API) — this function is pure

### Date Utilities

- [ ] `formatExpenseDate(isoString: string): string` — human-readable (e.g. "Apr 28")
- [ ] `formatRelativeTime(isoString: string): string` — (e.g. "2 hours ago")

### Validation Utilities

- [ ] `isValidUsername(username: string): boolean` — alphanumeric + underscores, 3-20 chars
- [ ] `isValidEmail(email: string): boolean`

### Unit Tests

- [ ] Full unit test suite for all split calculation functions
- [ ] Edge cases: single member, rounding, zero amounts, mismatched totals

---

## 4. `packages/ui` — Shared Web Components

Primitive components used by the Next.js web app. Built with React + Tailwind CSS.

- [ ] `Avatar` — user avatar with fallback initials
- [ ] `Badge` — status/category pill
- [ ] `Button` — primary, secondary, ghost, destructive variants
- [ ] `Card` — container with optional header/footer
- [ ] `CurrencyInput` — number input with currency selector
- [ ] `Dialog` / `Modal` — accessible overlay
- [ ] `Dropdown` — select/menu component
- [ ] `EmptyState` — illustration + message for empty lists
- [ ] `Input` — text input with label and error state
- [ ] `LoadingSpinner`
- [ ] `Tabs` — tab bar component
- [ ] `Toast` / `Snackbar` — notification system
- [ ] `UserListItem` — avatar + name + subtitle row (used in group member lists etc.)

---

## 5. `packages/ui-native` — Shared Mobile Components

React Native equivalents of the web primitives, styled with NativeWind.

- [ ] `Avatar`
- [ ] `Badge`
- [ ] `Button`
- [ ] `Card`
- [ ] `CurrencyInput`
- [ ] `BottomSheet` — used heavily in Splitwise-style flows
- [ ] `EmptyState`
- [ ] `Input`
- [ ] `LoadingSpinner`
- [ ] `Toast`
- [ ] `UserListItem`
- [ ] `SectionList` wrapper with styled headers
