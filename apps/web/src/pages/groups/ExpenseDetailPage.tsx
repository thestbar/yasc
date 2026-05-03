import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useExpense, useDeleteExpense } from '../../lib/hooks/useExpenses'
import { useGroup } from '../../lib/hooks/useGroups'
import { useAuthStore } from '../../lib/store/auth'
import { formatCurrency, formatExpenseDate } from '@yasc/utils'

export function ExpenseDetailPage() {
  const { id, expenseId } = useParams<{ id: string; expenseId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: expense, isLoading } = useExpense(id!, expenseId!)
  const { data: group } = useGroup(id!)
  const deleteExpense = useDeleteExpense()

  const canEdit = expense && (expense.createdById === user?.id || expense.paidById === user?.id)

  const onDelete = async () => {
    if (!confirm('Delete this expense?')) return
    try {
      await deleteExpense.mutateAsync({ groupId: id!, expenseId: expenseId! })
      navigate(`/groups/${id}`)
    } catch {
      toast.error('Failed to delete expense')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-48" />
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!expense) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link to={`/groups/${id}`} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Expense</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link to={`/groups/${id}/expenses/${expenseId}/edit`} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <Pencil size={18} />
            </Link>
            <button onClick={onDelete} disabled={deleteExpense.isPending} className="p-2 text-red-500 hover:text-red-600 disabled:opacity-50">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold">{expense.description}</h2>
        <p className="text-2xl font-bold text-brand-600 mt-1">{formatCurrency(expense.amount, expense.currency)}</p>

        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Paid by</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{expense.paidBy?.displayName ?? expense.paidBy?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatExpenseDate(expense.date)}</span>
          </div>
          <div className="flex justify-between">
            <span>Category</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{expense.category}</span>
          </div>
          <div className="flex justify-between">
            <span>Split type</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{expense.splitType}</span>
          </div>
        </div>

        {expense.notes && (
          <p className="mt-4 text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">{expense.notes}</p>
        )}

        {expense.splits && expense.splits.length > 0 && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-sm font-medium mb-2">Split breakdown</p>
            <div className="space-y-1.5">
              {expense.splits.map((split) => (
                <div key={split.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{split.user?.displayName ?? split.user?.username}</span>
                  <span className="font-medium">{formatCurrency(split.amount, expense.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
