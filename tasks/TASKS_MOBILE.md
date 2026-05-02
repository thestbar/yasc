# Agent: Mobile

**Can start:** After `apps/api/openapi.json` is committed by the Backend agent.
**Owns:** Everything under `apps/mobile/`.
**Depends on:** `@yasc/types`, `@yasc/utils`, `@yasc/ui-native` from `packages/`

Stack: Expo (SDK 51+) · React Native · TypeScript · NativeWind · React Query · Zustand · Expo Router

---

## 1. Expo App Scaffold

- [ ] Generate Expo app in `apps/mobile/` (`npx create-expo-app mobile --template`)
- [ ] Configure for Nx workspace (add `project.json`)
- [ ] Install dependencies:
  - `expo-router` — file-based navigation
  - `@tanstack/react-query` — server state
  - `zustand` — auth session + UI state
  - `axios` — HTTP client
  - `react-hook-form` + `zod` — form handling and validation
  - `nativewind` — Tailwind-style styling
  - `dayjs` — date formatting
  - `expo-secure-store` — secure JWT storage
  - `expo-image-picker` — avatar + receipt image upload
  - `expo-clipboard` — copy invite link to clipboard
  - `expo-haptics` — haptic feedback on key interactions
  - `react-native-bottom-sheet` — Gorhom bottom sheet (expense flows)
  - `react-native-reanimated` — animations
  - `@react-native-community/datetimepicker` — date picker
  - `react-native-gesture-handler` — gesture support
  - `react-native-safe-area-context`
  - `react-native-screens`
- [ ] Configure NativeWind with shared Tailwind config
- [ ] Configure `app.json` / `app.config.ts`:
  - App name, bundle identifier, icon, splash screen
  - Plugins: `expo-router`, `expo-secure-store`
- [ ] Set up React Query provider in root layout
- [ ] Set up Zustand auth store with `expo-secure-store` persistence
- [ ] Configure Axios instance with base URL from env, auto-attach JWT, handle 401 refresh

---

## 2. API Client Layer

- [ ] Reuse / mirror the same API client structure as the web app
- [ ] Create `apps/mobile/lib/api/` with one file per resource:
  - `auth.ts`, `users.ts`, `friends.ts`, `groups.ts`
  - `expenses.ts`, `settlements.ts`, `currency.ts`, `activity.ts`
- [ ] Custom React Query hooks for each endpoint
- [ ] Optimistic updates for expense creation and settlement recording

---

## 3. Navigation Structure (Expo Router)

```
app/
├── _layout.tsx                  # Root layout (auth gate, providers)
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (tabs)/
│   ├── _layout.tsx              # Tab bar layout
│   ├── groups/
│   │   ├── index.tsx            # Groups list
│   │   ├── new.tsx              # Create group
│   │   ├── [id]/
│   │   │   ├── index.tsx        # Group detail
│   │   │   ├── settings.tsx     # Group settings
│   │   │   └── expenses/
│   │   │       ├── new.tsx      # Add expense
│   │   │       └── [expenseId]/
│   │   │           ├── index.tsx  # Expense detail
│   │   │           └── edit.tsx   # Edit expense
│   ├── friends/
│   │   ├── index.tsx            # Friends list
│   │   └── [id].tsx             # Friend detail
│   ├── activity/
│   │   └── index.tsx            # Activity feed
│   └── account/
│       └── index.tsx            # Account / profile
└── join/
    └── [inviteCode].tsx         # Join via invite link (deep link)
```

---

## 4. Authentication Screens

### Login (`/login`)

- [ ] Email + password inputs
- [ ] "Log In" button with loading state
- [ ] Link to register
- [ ] Link to forgot password
- [ ] Keyboard avoiding view

### Register (`/register`)

- [ ] Email, username, display name, password, confirm password
- [ ] Real-time username availability check (debounced, 500ms)
- [ ] Inline field validation
- [ ] Scrollable to handle keyboard

### Forgot Password (`/forgot-password`)

- [ ] Email input
- [ ] Success state shows "Check your email" message

### Reset Password (`/reset-password`)

- [ ] New password + confirm password
- [ ] Accepts token via deep link query param

### Auth Flow

- [ ] On app start: check for stored tokens, auto-login if valid
- [ ] Redirect to `/(tabs)/groups` on successful auth
- [ ] Redirect to `/(auth)/login` on logout or expired session
- [ ] Biometric unlock (Face ID / Touch ID) as optional enhancement (Phase 2)

---

## 5. Tab Bar

- [ ] 4 tabs: Groups, Friends, Activity, Account
- [ ] Custom tab bar icons (lucide-react-native or expo/vector-icons)
- [ ] Tab bar respects safe area insets

---

## 6. Groups Tab

### Groups List (`/(tabs)/groups`)

- [ ] FlatList of group cards
- [ ] Each card: group image/avatar, name, date range, balance summary
  - "You owe $X", "You are owed $X", or "Settled up"
- [ ] Pull-to-refresh
- [ ] "+" FAB button → Create Group sheet
- [ ] Empty state with illustration and prompt

### Create Group Bottom Sheet

- [ ] Slides up from bottom (Gorhom BottomSheet)
- [ ] Fields: name (required), image picker, start/end date pickers, max members
- [ ] Default split selector
- [ ] Simplify debts toggle
- [ ] Submit → navigate to new group screen

### Group Detail Screen (`/(tabs)/groups/[id]`)

Mirror the Splitwise group screen as closely as possible:

- [ ] Header with group image, name, date range, settings gear icon
- [ ] Balance summary: your net position in bold (green = owed, red = you owe)
- [ ] Horizontal scroll of member avatars with their balance
- [ ] "Settle Up" button prominently placed
- [ ] SectionList of expenses grouped by month:
  - Each row: category icon, description, date (right), "You lent $X" / "You borrowed $X" (right, coloured)
  - Settlement rows visually distinct (different background, payment icon)
- [ ] Floating "Add Expense" button (bottom right)
- [ ] Pull-to-refresh

### Group Settings Screen (`/(tabs)/groups/[id]/settings`)

- [ ] Scrollable settings list with sections:

  **Group Info**
  - Edit name, image, start/end dates, max members (navigates to edit form)

  **Members**
  - List with avatar, name, role badge
  - "Add Member" row → search sheet
  - Swipe to remove (owner only)

  **Invite Link**
  - Display link with copy button
  - Share button (uses native share sheet)
  - Regenerate button (owner only)

  **Preferences**
  - Simplify debts toggle (with explanation text)
  - Default split selector

  **Danger Zone**
  - Leave Group (red, with confirmation alert)
  - Delete Group (red, owner only, confirmation requires typing group name)

---

## 7. Add / Edit Expense Screens

### Add Expense (`/(tabs)/groups/[id]/expenses/new`)

Full-screen modal style, mirror Splitwise's add expense screen:

- [ ] Top row: description input (large, auto-focused)
- [ ] Amount row: currency flag + code, large number input
  - Tap currency → full-screen currency picker (searchable, sorted by most used)
- [ ] Date row: tap to open date picker
- [ ] Category row: horizontal scroll of category icons, tap to select
- [ ] "Paid by" row: tap to open member picker (bottom sheet)
- [ ] "Split" row: shows current split summary (e.g. "Equally (4 people)")
  - Tap to open split editor (bottom sheet):
    - **Equal:** shows each person's calculated amount
    - **Percentage:** number inputs per person, live total indicator
    - **Exact:** currency inputs per person, live total indicator
    - **Shares:** integer inputs per person, live share calculation
- [ ] Notes input (optional, collapsible)
- [ ] Receipt camera / photo picker (optional)
- [ ] "Save" button in header

### Edit Expense (`/(tabs)/groups/[id]/expenses/[expenseId]/edit`)

- [ ] Pre-populated identical to add expense form
- [ ] "Delete" option in header (with confirmation)

### Expense Detail (`/(tabs)/groups/[id]/expenses/[expenseId]`)

- [ ] Full expense info card
- [ ] Split breakdown list: each member row with amount and settled indicator
- [ ] Notes and receipt image (tappable for full screen)
- [ ] "Added by X on [date]" footer
- [ ] Edit button in header

---

## 8. Settle Up Flow

- [ ] Bottom sheet triggered from group detail or member balance tap
- [ ] Pre-filled: suggested from/to users and amount based on balance
- [ ] Editable: amount, currency, date, notes
- [ ] "Record Payment" confirm button

---

## 9. Currency Picker

- [ ] Full-screen modal with search bar
- [ ] Two sections: "Suggested" (most used 8 currencies) and "All Currencies" (alphabetical)
- [ ] Each row: currency flag emoji, code, full name
- [ ] Dismiss with back gesture or cancel button

---

## 10. Currency Conversion

- [ ] "View in" currency selector on group detail screen (accessible from header menu)
- [ ] All amounts re-render in selected target currency
- [ ] Rates fetched and cached via React Query

---

## 11. Friends Tab (`/(tabs)/friends`)

### Friends List

- [ ] FlatList of friends: avatar, display name, username, net balance
- [ ] "Add Friend" button → search bottom sheet
- [ ] Pending requests section with accept/decline buttons
- [ ] Empty state

### Add Friend Sheet

- [ ] Search by email or username (debounced)
- [ ] User result row with "Add" button
- [ ] Pending state shown after request is sent

### Friend Detail (`/(tabs)/friends/[id]`)

- [ ] Header: friend avatar + name + username
- [ ] Net balance card
- [ ] Group breakdown: balance per shared group
- [ ] "Settle Up" button
- [ ] "Remove Friend" option (accessible via header menu)

---

## 12. Activity Tab (`/(tabs)/activity`)

- [ ] Infinite-scrolling FlatList
- [ ] Filter by group: horizontal scroll filter chips at top
- [ ] Each item: actor avatar, activity description, group name chip, relative time
- [ ] Activity types with distinct icons:
  - Expense added: receipt icon
  - Expense edited: pencil icon
  - Expense deleted: trash icon
  - Settlement: payment icon
  - Member joined/left: person icon
- [ ] Pull-to-refresh

---

## 13. Account Tab (`/(tabs)/account`)

- [ ] Avatar (tappable to change)
- [ ] Display name, username, email
- [ ] "Edit Profile" → form to update name and avatar
- [ ] "Change Password" → form
- [ ] "Default Currency" → currency picker
- [ ] Dark/Light/System theme selector
- [ ] App version number
- [ ] "Log Out" button (with confirmation)
- [ ] "Delete Account" (danger zone)

---

## 14. Join Group via Deep Link (`/join/[inviteCode]`)

- [ ] Configure deep link scheme in `app.config.ts` (e.g. `yasc://join/[code]`)
- [ ] Configure universal links / app links for web URLs
- [ ] Screen shows group preview: image, name, member count, date range
- [ ] "Join Group" CTA
- [ ] If not logged in: redirect to login, then return to join screen
- [ ] After joining: navigate to group detail

---

## 15. Offline & UX Polish

- [ ] Show "You're offline" banner when no network connection
- [ ] Skeleton loaders for all loading states
- [ ] Haptic feedback on: save expense, settle up, accept friend request
- [ ] Swipe-to-refresh on all list screens
- [ ] Keyboard avoiding behaviour on all forms
- [ ] Safe area insets on all screens

---

## 16. Testing

- [ ] Unit tests for API client hooks and utility functions (Jest)
- [ ] Component tests with React Native Testing Library for critical screens
- [ ] Manual QA checklist for iOS (Simulator) and Android (Emulator)
