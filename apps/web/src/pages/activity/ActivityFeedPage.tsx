import { useState } from 'react'
import { useActivity } from '../../lib/hooks/useActivity'
import { formatRelativeTime } from '@yasc/utils'
import type { ActivityItem } from '@yasc/types'

function activityText(item: ActivityItem): string {
  const actor = item.actor?.displayName ?? item.actor?.username ?? 'Someone'
  const group = item.group?.name ? ` in ${item.group.name}` : ''
  switch (item.type) {
    case 'expense_added': return `${actor} added an expense${group}`
    case 'expense_updated': return `${actor} updated an expense${group}`
    case 'expense_deleted': return `${actor} deleted an expense${group}`
    case 'settlement_recorded': return `${actor} recorded a settlement${group}`
    case 'member_joined': return `${actor} joined${group}`
    case 'member_left': return `${actor} left${group}`
    case 'group_created': return `${actor} created a group`
    case 'group_updated': return `${actor} updated${group}`
    default: return `${actor} did something${group}`
  }
}

export function ActivityFeedPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useActivity({ page, limit: 20 })
  const items = data?.data ?? []
  const hasMore = data?.hasMore ?? false

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Activity</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No activity yet.</p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3"
              >
                <p className="text-sm">{activityText(item)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(item.createdAt)}</p>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full mt-4 py-2 text-sm text-brand-600 hover:text-brand-700"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  )
}
