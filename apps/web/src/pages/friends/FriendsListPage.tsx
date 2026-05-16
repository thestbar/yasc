import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Check, X, Clock } from 'lucide-react'
import {
  useFriends, useFriendRequests, useSentFriendRequests, useUserSearch,
  useSendFriendRequest, useAcceptFriendRequest, useDeclineFriendRequest,
  useRemoveFriend, useCancelFriendRequest,
} from '../../lib/hooks/useFriends'
import { useAuthStore } from '../../lib/store/auth'
import type { Friendship, User } from '@yasc/types'

function otherUser(f: Friendship, myId: string | undefined) {
  return f.user.id === myId ? f.friend : f.user
}

export function FriendsListPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [friendsFilter, setFriendsFilter] = useState('')
  const me = useAuthStore((s) => s.user)

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 350)
    return () => clearTimeout(t)
  }, [rawQuery])

  const { data: friends = [], isLoading } = useFriends()
  const { data: incoming = [] } = useFriendRequests()
  const { data: sent = [] } = useSentFriendRequests()
  const { data: searchResults = [], isFetching: searching } = useUserSearch(query)

  const sendRequest = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const remove = useRemoveFriend()
  const cancel = useCancelFriendRequest()

  // lookup maps for quick status checks in search results
  const friendIds = new Set(friends.map((f) => otherUser(f, me?.id).id))
  const sentMap = new Map(sent.map((s) => [s.friend!.id, s]))
  const incomingMap = new Map(incoming.map((r) => [r.user!.id, r]))

  const filtered = friends.filter((f) => {
    const other = otherUser(f, me?.id)
    const q = friendsFilter.toLowerCase()
    return !q || other.displayName.toLowerCase().includes(q) || other.username.toLowerCase().includes(q)
  })

  const onSend = async (user: User) => {
    try {
      await sendRequest.mutateAsync(user.username)
      toast.success(`Friend request sent to ${user.displayName}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send request')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Friends</h1>
        <button
          onClick={() => { setShowAdd((v) => !v); setRawQuery(''); setQuery('') }}
          className="flex items-center gap-1.5 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700"
        >
          <UserPlus size={16} />
          Add friend
        </button>
      </div>

      {/* Add friend search panel */}
      {showAdd && (
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <input
            autoFocus
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search by email or username…"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {query.length >= 2 && (
            <div className="mt-3 space-y-2">
              {searching && (
                <p className="text-xs text-gray-400 text-center py-2">Searching…</p>
              )}
              {!searching && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No users found.</p>
              )}
              {searchResults.map((user) => {
                const isFriend = friendIds.has(user.id)
                const sentFriendship = sentMap.get(user.id)
                const incomingFriendship = incomingMap.get(user.id)

                return (
                  <div key={user.id} className="flex items-center justify-between py-2 px-1">
                    <div>
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFriend ? (
                        <span className="text-xs text-gray-400 font-medium">Friends</span>
                      ) : sentFriendship ? (
                        <>
                          <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                            <Clock size={12} /> Pending
                          </span>
                          <button
                            onClick={() => cancel.mutate(sentFriendship.id)}
                            disabled={cancel.isPending}
                            className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : incomingFriendship ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => accept.mutate(incomingFriendship.id)}
                            disabled={accept.isPending}
                            className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => decline.mutate(incomingFriendship.id)}
                            disabled={decline.isPending}
                            className="p-1.5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSend(user)}
                          disabled={sendRequest.isPending}
                          className="flex items-center gap-1 bg-brand-600 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                        >
                          <UserPlus size={12} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-gray-400 mt-2">Type at least 2 characters to search.</p>
          )}
        </div>
      )}

      {/* Incoming pending requests */}
      {incoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 text-gray-500 uppercase tracking-wide">Requests received</h2>
          <div className="space-y-2">
            {incoming.map((req) => {
              const requester = req.user!
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

      {/* Sent pending requests */}
      {sent.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 text-gray-500 uppercase tracking-wide">Requests sent</h2>
          <div className="space-y-2">
            {sent.map((req) => {
              const recipient = req.friend!
              return (
                <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{recipient.displayName}</p>
                    <p className="text-xs text-gray-500">@{recipient.username}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </span>
                    <button
                      onClick={() => cancel.mutate(req.id)}
                      disabled={cancel.isPending}
                      className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      {friends.length > 0 && (
        <input
          value={friendsFilter}
          onChange={(e) => setFriendsFilter(e.target.value)}
          placeholder="Filter friends…"
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">{friends.length === 0 ? 'No friends yet. Add someone to get started!' : 'No results.'}</p>
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
                  onClick={() => {
                    if (confirm(`Remove ${friend.displayName} from friends?`)) remove.mutate(f.id)
                  }}
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
