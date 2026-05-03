import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { GuestRoute } from './components/shared/GuestRoute'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// App pages
import { GroupsListPage } from './pages/groups/GroupsListPage'
import { CreateGroupPage } from './pages/groups/CreateGroupPage'
import { GroupDetailPage } from './pages/groups/GroupDetailPage'
import { GroupSettingsPage } from './pages/groups/GroupSettingsPage'
import { AddExpensePage } from './pages/groups/AddExpensePage'
import { EditExpensePage } from './pages/groups/EditExpensePage'
import { ExpenseDetailPage } from './pages/groups/ExpenseDetailPage'
import { JoinGroupPage } from './pages/groups/JoinGroupPage'
import { FriendsListPage } from './pages/friends/FriendsListPage'
import { ActivityFeedPage } from './pages/activity/ActivityFeedPage'
import { AccountPage } from './pages/account/AccountPage'
import { NotFoundPage } from './pages/NotFoundPage'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const router: any = createBrowserRouter([
  { path: '/', element: <Navigate to="/groups" replace /> },
  {
    path: '/auth/login',
    element: <GuestRoute><LoginPage /></GuestRoute>,
  },
  {
    path: '/auth/register',
    element: <GuestRoute><RegisterPage /></GuestRoute>,
  },
  {
    path: '/auth/forgot-password',
    element: <GuestRoute><ForgotPasswordPage /></GuestRoute>,
  },
  {
    path: '/auth/reset-password',
    element: <GuestRoute><ResetPasswordPage /></GuestRoute>,
  },
  { path: '/join/:inviteCode', element: <JoinGroupPage /> },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/groups', element: <GroupsListPage /> },
      { path: '/groups/new', element: <CreateGroupPage /> },
      { path: '/groups/:id', element: <GroupDetailPage /> },
      { path: '/groups/:id/settings', element: <GroupSettingsPage /> },
      { path: '/groups/:id/expenses/new', element: <AddExpensePage /> },
      { path: '/groups/:id/expenses/:expenseId', element: <ExpenseDetailPage /> },
      { path: '/groups/:id/expenses/:expenseId/edit', element: <EditExpensePage /> },
      { path: '/friends', element: <FriendsListPage /> },
      { path: '/activity', element: <ActivityFeedPage /> },
      { path: '/account', element: <AccountPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
