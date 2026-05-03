import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { useGroup, useGroupMembers } from '../../lib/hooks/useGroups'
import { useCreateExpense } from '../../lib/hooks/useExpenses'
import { useAuthStore } from '../../lib/store/auth'
import type { SplitType } from '@yasc/types'

const schema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Must be positive'),
  paidById: z.string().min(1, 'Payer is required'),
  category: z.string().default('other'),
  date: z.string().min(1),
  notes: z.string().max(500).optional(),
})
type Fields = z.infer<typeof schema>

const CATEGORIES = ['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'utilities', 'health', 'other'] as const

export function AddExpensePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: group } = useGroup(id!)
  const { data: members = [] } = useGroupMembers(id!)
  const createExpense = useCreateExpense()

  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [splits, setSplits] = useState<Record<string, string>>({})

  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      paidById: user?.id ?? '',
      date: new Date().toISOString().slice(0, 10),
      category: 'other',
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    const amountCents = Math.round(data.amount * 100)
    const memberIds = members.map((m) => m.userId)

    let splitInputs: { userId: string; amount: number }[]
    if (splitType === 'equal') {
      const perPerson = Math.floor(amountCents / memberIds.length)
      const remainder = amountCents % memberIds.length
      splitInputs = memberIds.map((uid, i) => ({ userId: uid, amount: perPerson + (i < remainder ? 1 : 0) }))
    } else if (splitType === 'exact') {
      splitInputs = memberIds.map((uid) => ({
        userId: uid,
        amount: Math.round(parseFloat(splits[uid] || '0') * 100),
      }))
    } else if (splitType === 'percentage') {
      splitInputs = memberIds.map((uid) => ({
        userId: uid,
        amount: Math.round(amountCents * parseFloat(splits[uid] || '0') / 100),
        percentage: parseFloat(splits[uid] || '0'),
      }))
    } else {
      const totalShares = memberIds.reduce((s, uid) => s + parseFloat(splits[uid] || '0'), 0)
      splitInputs = memberIds.map((uid) => ({
        userId: uid,
        amount: totalShares > 0 ? Math.round(amountCents * parseFloat(splits[uid] || '0') / totalShares) : 0,
        shares: parseFloat(splits[uid] || '0'),
      }))
    }

    try {
      await createExpense.mutateAsync({
        groupId: id!,
        description: data.description,
        amount: amountCents,
        currency: group?.currency ?? 'USD',
        paidById: data.paidById,
        category: data.category,
        date: data.date,
        notes: data.notes,
        splitType,
        splits: splitInputs,
      })
      navigate(`/groups/${id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add expense')
    }
  })

  if (!group) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to={`/groups/${id}`} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Add expense</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input {...register('description')} placeholder="e.g. Dinner at restaurant" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ({group.currency})</label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number" step="0.01" min="0.01" placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input {...register('date')} type="date" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paid by</label>
            <select {...register('paidById')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user?.displayName ?? m.user?.username}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select {...register('category')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Split</label>
            <div className="flex gap-2">
              {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((t) => (
                <button
                  key={t} type="button" onClick={() => setSplitType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${splitType === t ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {splitType !== 'equal' && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{m.user?.displayName ?? m.user?.username}</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={splits[m.userId] ?? ''}
                    onChange={(e) => setSplits((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                    placeholder={splitType === 'percentage' ? '%' : splitType === 'shares' ? 'shares' : '0.00'}
                    className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={2} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <button type="submit" disabled={createExpense.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            {createExpense.isPending ? 'Adding…' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  )
}
