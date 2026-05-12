import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groupsApi } from '../../lib/api/groups'
import { useAuthStore } from '../../lib/store/auth'
import { useIsMember } from '../../lib/hooks/useGroups'

export function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const redirectParam = `?redirect=${encodeURIComponent(`/join/${inviteCode}`)}`

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['join-preview', inviteCode],
    queryFn: () => groupsApi.joinPreview(inviteCode!),
  })

  const { data: alreadyMember = false } = useIsMember(preview?.id, !!user)

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <p className="text-sm text-gray-500">This invite link is invalid or has expired.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-1">You're invited!</h2>
        <p className="text-sm text-gray-500 mb-1">Join <strong>{preview.name}</strong></p>
        {preview.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{preview.description}</p>
        )}
        <p className="text-xs text-gray-400 mb-6">
          {preview.memberCount} member{preview.memberCount !== 1 ? 's' : ''} · {preview.currency}
        </p>

        {user && alreadyMember ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">You're already a member of this group.</p>
            <Link
              to={`/groups/${preview.id}`}
              className="block w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 text-center"
            >
              Go to group
            </Link>
          </div>
        ) : user ? (
          <button
            onClick={() => join.mutate()}
            disabled={join.isPending}
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {join.isPending ? 'Joining…' : `Join ${preview.name}`}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center mb-3">Sign in or create an account to join.</p>
            <Link
              to={`/auth/login${redirectParam}`}
              className="block w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 text-center"
            >
              Sign in
            </Link>
            <Link
              to={`/auth/register${redirectParam}`}
              className="block w-full border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 text-center"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
