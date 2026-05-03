import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groupsApi } from '../../lib/api/groups'
import { useAuthStore } from '../../lib/store/auth'

export function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['join-preview', inviteCode],
    queryFn: () => groupsApi.joinPreview(inviteCode!),
  })

  const join = useMutation({
    mutationFn: () => groupsApi.join(inviteCode!),
    onSuccess: (group) => {
      toast.success(`Joined ${group.name}!`)
      navigate(`/groups/${group.id}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to join group')
    },
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Join group</h2>
          <p className="text-sm text-gray-500 mb-4">Sign in to join this group.</p>
          <a href={`/auth/login?redirect=/join/${inviteCode}`} className="block w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700">
            Sign in
          </a>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-1">You're invited!</h2>
        <p className="text-sm text-gray-500 mb-6">Join <strong>{preview.name}</strong></p>
        {preview.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{preview.description}</p>}
        <p className="text-xs text-gray-400 mb-6">{preview.memberCount} member{preview.memberCount !== 1 ? 's' : ''} · {preview.currency}</p>
        <button
          onClick={() => join.mutate()}
          disabled={join.isPending}
          className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {join.isPending ? 'Joining…' : `Join ${preview.name}`}
        </button>
      </div>
    </div>
  )
}
