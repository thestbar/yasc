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
  const { data: balances = [] } = useGroupBalances(id!)
  const settle = useCreateSettlement()

  const handleSettle = async (toUserId: string, toUserName: string, amount: number) => {
    if (!group || !user) return
    try {
      await settle.mutateAsync({
        groupId: id!,
        fromUserId: user.id,
        toUserId,
        amount,
        currency: group.currency,
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
      {balances.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Balances</h2>
          <div className="space-y-2">
            {balances.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{b.fromUserName}</span>
                  {' owes '}
                  <span className="font-medium">{b.toUserName}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-500">{formatCurrency(b.amount, group.currency)}</span>
                  {b.fromUserId === user?.id && (
                    <button
                      onClick={() => handleSettle(b.toUserId, b.toUserName, b.amount)}
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
                <p className="font-semibold text-sm ml-3 shrink-0">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
