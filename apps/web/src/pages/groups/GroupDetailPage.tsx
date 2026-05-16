import { Link, useParams } from 'react-router-dom'
import { Plus, Settings, ChevronLeft, ArrowRightLeft } from 'lucide-react'
import { useGroup, useGroupBalances } from '../../lib/hooks/useGroups'
import { useGroupExpenses } from '../../lib/hooks/useExpenses'
import { useCreateSettlement } from '../../lib/hooks/useSettlements'
import { useAuthStore } from '../../lib/store/auth'
import { formatCurrency, formatExpenseDate } from '@yasc/utils'
import { toast } from 'sonner'

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: group, isLoading: loadingGroup } = useGroup(id!)
  const { data: expenses = [], isLoading: loadingExpenses } = useGroupExpenses(id!)
  const { data: balanceData } = useGroupBalances(id!)
  const settle = useCreateSettlement()

  const simplifiedDebts = balanceData?.simplifiedDebts ?? []
  const rawBalances = balanceData?.balances ?? []
  const showDebts = group?.simplifyDebts ?? false

  const handleSettle = async (toUserId: string, toUserName: string, amount: number, currency: string) => {
    if (!group || !user) return
    if (!confirm(`Record a settlement of ${formatCurrency(amount, currency)} to ${toUserName}?`)) return
    try {
      await settle.mutateAsync({
        groupId: id!,
        fromUserId: user.id,
        toUserId,
        amount,
        currency,
        date: new Date().toISOString().slice(0, 10),
      })
      toast.success(`Settled up with ${toUserName}`)
    } catch {
      toast.error('Failed to record settlement')
    }
  }

  if (loadingGroup) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-48" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center text-gray-500">
        <p>Group not found.</p>
        <Link to="/groups" className="text-brand-600 text-sm mt-2 block">Back to groups</Link>
      </div>
    )
  }

  const hasBalances = showDebts ? simplifiedDebts.length > 0 : rawBalances.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link to="/groups" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            <p className="text-xs text-gray-500">{group.currency}</p>
          </div>
        </div>
        <Link to={`/groups/${id}/settings`} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <Settings size={20} />
        </Link>
      </div>

      {/* Balance summary */}
      {hasBalances && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Balances</h2>

          {showDebts ? (
            <div className="space-y-2">
              {simplifiedDebts.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{d.fromUserName}</span>
                    {' owes '}
                    <span className="font-medium">{d.toUserName}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${d.toUserId === user?.id ? 'text-green-600' : d.fromUserId === user?.id ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>{formatCurrency(d.amount, d.currency)}</span>
                    {d.fromUserId === user?.id && (
                      <button
                        onClick={() => handleSettle(d.toUserId, d.toUserName, d.amount, d.currency)}
                        disabled={settle.isPending}
                        className="flex items-center gap-1 text-xs bg-brand-600 text-white px-2 py-1 rounded-md hover:bg-brand-700 disabled:opacity-50"
                      >
                        <ArrowRightLeft size={12} />
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {rawBalances.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{b.userName}</span>
                  <span className={`font-semibold ${b.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {b.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(b.amount), b.currency)}
                    {b.currency !== group.currency && <span className="text-gray-400 ml-1 font-normal">{b.currency}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expenses list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Expenses</h2>
        <Link
          to={`/groups/${id}/expenses/new`}
          className="flex items-center gap-1 text-xs bg-brand-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-brand-700"
        >
          <Plus size={14} />
          Add
        </Link>
      </div>

      {loadingExpenses ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No expenses yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <Link
              key={expense.id}
              to={`/groups/${id}/expenses/${expense.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{expense.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Paid by {expense.paidBy?.displayName ?? expense.paidBy?.username} · {formatExpenseDate(expense.date)}
                  </p>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <p className="font-semibold text-sm">{formatCurrency(expense.amount, expense.currency)}</p>
                  {expense.originalCurrency && expense.originalCurrency !== expense.currency && (
                    <p className="text-xs text-gray-400">{formatCurrency(expense.originalAmount!, expense.originalCurrency)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
