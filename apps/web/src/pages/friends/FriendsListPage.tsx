import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Check, X } from 'lucide-react'
import {
  useFriends, useFriendRequests, useSendFriendRequest,
  useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend,
} from '../../lib/hooks/useFriends'
import { useAuthStore } from '../../lib/store/auth'
import type { Friendship } from '@yasc/types'

function otherUser(f: Friendship, myId: string | undefined) {
  return f.user.id === myId ? f.friend : f.user
}

export function FriendsListPage() {
  const [search, setSearch] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const me = useAuthStore((s) => s.user)

  const { data: friends = [], isLoading } = useFriends()
  const { data: requests = [] } = useFriendRequests()
  const sendRequest = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const remove = useRemoveFriend()

  const filtered = friends.filter((f) => {
    const other = otherUser(f, me?.id)
    const q = search.toLowerCase()
    return !q || other.displayName.toLowerCase().includes(q) || other.username.toLowerCase().includes(q)
  })

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return
    try {
      await sendRequest.mutateAsync(identifier.trim())
      toast.success('Friend request sent')
      setIdentifier('')
      setShowAdd(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send request')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Friends</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700"
        >
          <UserPlus size={16} />
          Add friend
        </button>
      </div>

      {showAdd && (
        <form onSubmit={onSend} className="flex gap-2 mb-4">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or username"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit" disabled={sendRequest.isPending} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {sendRequest.isPending ? '…' : 'Send'}
          </button>
        </form>
      )}

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 text-gray-500">Pending requests</h2>
          <div className="space-y-2">
            {requests.map((req) => {
              const requester = otherUser(req, me?.id)
              return (
                <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{requester.displayName}</p>
                    <p className="text-xs text-gray-500">@{requester.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => accept.mutate(req.id)}
                      disabled={accept.isPending}
                      className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => decline.mutate(req.id)}
                      disabled={decline.isPending}
                      className="p-1.5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search */}
      {friends.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends…"
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">{friends.length === 0 ? 'No friends yet.' : 'No results.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => {
            const friend = otherUser(f, me?.id)
            return (
              <div key={f.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{friend.displayName}</p>
                  <p className="text-xs text-gray-500">@{friend.username}</p>
                </div>
                <button
                  onClick={() => { if (confirm(`Remove ${friend.displayName} from friends?`)) remove.mutate(f.id) }}
                  disabled={remove.isPending}
                  className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
