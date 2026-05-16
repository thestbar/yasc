import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, Copy, RefreshCw, LogOut, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { Checkbox } from '../../components/shared/Checkbox'
import {
  useGroup, useGroupMembers, useUpdateGroup, useDeleteGroup,
  useRemoveMember, useLeaveGroup, useRegenerateInvite, useAddMember,
  useConvertAll, useConvertAllPreview,
} from '../../lib/hooks/useGroups'
import { useAuthStore } from '../../lib/store/auth'
import { CURRENCIES } from '@yasc/utils'

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string(),
  simplifyDebts: z.boolean(),
  consolidateCurrencies: z.boolean(),
})
type Fields = z.infer<typeof schema>

export function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: group } = useGroup(id!)
  const { data: members = [] } = useGroupMembers(id!)
  const update = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const removeMember = useRemoveMember()
  const leaveGroup = useLeaveGroup()
  const regenerate = useRegenerateInvite()
  const addMember = useAddMember()
  const convertAll = useConvertAll()

  const [addQuery, setAddQuery] = useState('')
  const [showConvertAllModal, setShowConvertAllModal] = useState(false)

  const { data: convertAllPreview, isFetching: previewLoading } = useConvertAllPreview(id!, showConvertAllModal)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (group) reset({ name: group.name, description: group.description ?? '', currency: group.currency, simplifyDebts: group.simplifyDebts, consolidateCurrencies: group.consolidateCurrencies })
  }, [group, reset])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const isOwner = members.find((m) => m.userId === user?.id)?.role === 'owner'

  const onSave = handleSubmit(async (data) => {
    try {
      await update.mutateAsync({ id: id!, data })
      toast.success('Group updated')
    } catch {
      toast.error('Failed to update group')
    }
  })

  const onDelete = async () => {
    try {
      await deleteGroup.mutateAsync(id!)
      navigate('/groups')
    } catch {
      toast.error('Failed to delete group')
    }
  }

  const onLeave = async () => {
    if (!confirm('Leave this group?')) return
    try {
      await leaveGroup.mutateAsync(id!)
      navigate('/groups')
    } catch {
      toast.error('Failed to leave group')
    }
  }

  const onRegenerate = async () => {
    if (!confirm('Generate a new invite link? The old one will stop working.')) return
    try {
      await regenerate.mutateAsync(id!)
      toast.success('New invite link generated')
    } catch {
      toast.error('Failed to regenerate link')
    }
  }

  const onConvertAll = async () => {
    try {
      const result = await convertAll.mutateAsync(id!)
      toast.success(`Converted ${result.converted} expense${result.converted !== 1 ? 's' : ''} to ${group?.currency}${result.skipped > 0 ? ` (${result.skipped} skipped — rate unavailable)` : ''}`)
      setShowConvertAllModal(false)
    } catch {
      toast.error('Failed to convert expenses')
    }
  }

  const onAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = addQuery.trim()
    if (!q) return
    try {
      await addMember.mutateAsync({ groupId: id!, query: q })
      toast.success(`Added ${q} to the group`)
      setAddQuery('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'User not found')
    }
  }

  const copyInvite = () => {
    if (!group?.inviteCode) return
    const url = `${window.location.origin}/join/${group.inviteCode}`
    navigator.clipboard.writeText(url)
    toast.success('Invite link copied')
  }

  if (!group) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to={`/groups/${id}`} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Group settings</h1>
      </div>

      {/* Edit form (owner only) */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
          <h2 className="text-sm font-semibold mb-4">Details</h2>
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input {...register('name')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea {...register('description')} rows={2} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select {...register('currency')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <Checkbox
              {...register('simplifyDebts')}
              label="Simplify debts"
              description="Reduce the number of transactions needed to settle up"
            />
            <Checkbox
              {...register('consolidateCurrencies')}
              label="Auto-convert currencies"
              description={`Automatically convert expenses in other currencies to ${group.currency} using live exchange rates`}
            />
            <button type="submit" disabled={!isDirty || update.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk currency conversion (owner only) */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
          <h2 className="text-sm font-semibold mb-1">Currency conversion</h2>
          <p className="text-xs text-gray-500 mb-3">
            Convert all expenses that are not in <span className="font-medium">{group.currency}</span> to the group currency using live exchange rates.
          </p>
          <button
            onClick={() => setShowConvertAllModal(true)}
            className="flex items-center gap-2 text-sm bg-brand-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-brand-700"
          >
            <RefreshCw size={14} />
            Convert all to {group.currency}
          </button>
        </div>
      )}

      {/* Invite link */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
        <h2 className="text-sm font-semibold mb-3">Invite link</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={group.inviteCode ? `${window.location.origin}/join/${group.inviteCode}` : ''}
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          />
          <button onClick={copyInvite} className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            <Copy size={16} />
          </button>
          {isOwner && (
            <button onClick={onRegenerate} disabled={regenerate.isPending} className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
        <h2 className="text-sm font-semibold mb-3">Members</h2>

        <form onSubmit={onAddMember} className="flex gap-2 mb-4">
          <input
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Username or email"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!addQuery.trim() || addMember.isPending}
            className="flex items-center gap-1.5 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 shrink-0"
          >
            <UserPlus size={15} />
            Add
          </button>
        </form>

        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{m.user?.displayName ?? m.user?.username}</p>
                <p className="text-xs text-gray-500">@{m.user?.username} · {m.role}</p>
              </div>
              {isOwner && m.userId !== user?.id && (
                <button
                  onClick={async () => {
                    const name = m.user?.displayName ?? m.user?.username ?? 'this member'
                    if (!confirm(`Remove ${name} from the group?`)) return
                    try {
                      await removeMember.mutateAsync({ groupId: id!, userId: m.userId })
                      toast.success(`${name} was removed from the group`)
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message ?? 'Failed to remove member')
                    }
                  }}
                  className="text-red-500 hover:text-red-600 p-1"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-3">Danger zone</h2>
        <div className="space-y-2">
          {!isOwner && (
            <button onClick={onLeave} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <LogOut size={16} /> Leave group
            </button>
          )}
          {isOwner && (
            <button onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true) }} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <Trash2 size={16} /> Delete group
            </button>
          )}
        </div>
      </div>

      {/* Convert-all confirmation modal */}
      {showConvertAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-base font-semibold">Convert all expenses to {group.currency}</h2>
            <p className="text-sm text-gray-500">
              This will convert every expense not already in <span className="font-medium text-gray-800 dark:text-gray-200">{group.currency}</span> using live exchange rates. The original currency and amount will be saved on each expense for reference.
            </p>

            {previewLoading ? (
              <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ) : convertAllPreview && convertAllPreview.breakdown.length > 0 ? (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 space-y-1.5">
                <p className="text-xs font-medium text-gray-500 mb-2">Expenses to convert</p>
                {convertAllPreview.breakdown.map((row) => (
                  <div key={row.currency} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{row.currency}</span>
                    <span className="font-medium">{row.count} expense{row.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            ) : convertAllPreview?.breakdown.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                All expenses are already in {group.currency}. Nothing to convert.
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertAllModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onConvertAll}
                disabled={convertAll.isPending || previewLoading || convertAllPreview?.breakdown.length === 0}
                className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
                {convertAll.isPending ? 'Converting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold mb-1">Delete group</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will permanently delete <span className="font-medium text-gray-800 dark:text-gray-200">{group.name}</span> and all its expenses. Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm.
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleteGroup.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteGroup.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
