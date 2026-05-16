import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import { useCreateGroup } from '../../lib/hooks/useGroups'
import { CURRENCIES } from '@yasc/utils'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().min(1),
  simplifyDebts: z.boolean(),
  consolidateCurrencies: z.boolean(),
})
type Fields = z.infer<typeof schema>

export function CreateGroupPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const create = useCreateGroup()
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'USD', simplifyDebts: true, consolidateCurrencies: false },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const group = await create.mutateAsync(data)
      await qc.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${group.id}`)
    } catch {
      toast.error('Failed to create group')
    }
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/groups" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">New group</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Group name</label>
            <input
              {...register('name')}
              placeholder="e.g. Tokyo Trip"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="What's this group for?"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              {...register('currency')}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('simplifyDebts')} type="checkbox" className="w-4 h-4 rounded accent-brand-600" />
            <div>
              <p className="text-sm font-medium">Simplify debts</p>
              <p className="text-xs text-gray-500">Reduce the number of transactions needed to settle up</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('consolidateCurrencies')} type="checkbox" className="w-4 h-4 rounded accent-brand-600" />
            <div>
              <p className="text-sm font-medium">Auto-convert currencies</p>
              <p className="text-xs text-gray-500">Automatically convert expenses in other currencies to the group currency using live exchange rates</p>
            </div>
          </label>

          <button
            type="submit"
            disabled={create.isPending}
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 mt-2"
          >
            {create.isPending ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </div>
    </div>
  )
}
