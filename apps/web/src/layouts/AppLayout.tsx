import { Outlet, NavLink } from 'react-router-dom'
import { Users, Receipt, Activity, User } from 'lucide-react'
import { clsx } from 'clsx'

const tabs = [
  { to: '/groups', icon: Receipt, label: 'Groups' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/account', icon: User, label: 'Account' },
]

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col lg:flex-row overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar — desktop only */}
      <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 gap-1">
        <div className="mb-6 px-2">
          <span className="text-xl font-bold text-brand-600 tracking-tight">YASC</span>
        </div>
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-500',
              )
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
