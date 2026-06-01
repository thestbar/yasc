import { useState } from 'react'
import { useActivity } from '../../lib/hooks/useActivity'
import { formatRelativeTime } from '@yasc/utils'
import type { ActivityItem } from '@yasc/types'

function fmt(amount: unknown, currency: unknown): string {
  if (typeof amount !== 'number' || typeof currency !== 'string') return ''
  return (amount / 100).toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 2 })
}

function activityText(item: ActivityItem): string {
  const actor = item.actor?.displayName ?? item.actor?.username ?? 'Someone'
  const inGroup = item.group?.name ? ` in ${item.group.name}` : ''
  const toGroup = item.group?.name ? ` to ${item.group.name}` : ' to the group'
  const fromGroup = item.group?.name ? ` from ${item.group.name}` : ' from the group'
  const groupName = item.group?.name ?? ''
  const meta = item.metadata ?? {}

  switch (item.type) {
    case 'expense_added':
    case 'expense_updated': {
      const verb = item.type === 'expense_added' ? 'added' : 'updated'
      const desc = typeof meta.description === 'string' && meta.description ? ` "${meta.description}"` : ''
      const total = fmt(meta.amount, meta.currency)
      const payer = typeof meta.paidByName === 'string' ? meta.paidByName : null
      const splits = Array.isArray(meta.splits) ? meta.splits as Array<{ name: string; amount: number }> : []
      const splitStr = splits.map(s => `${s.name} owes ${fmt(s.amount, meta.currency)}`).join(', ')
      const detail = payer
        ? ` — ${payer} paid${total ? ' ' + total : ''}${splitStr ? '; ' + splitStr : ''}`
        : total ? ` ${total}` : ''
      return `${actor} ${verb} expense${desc}${detail}${inGroup}`
    }
    case 'expense_deleted': {
      const desc = typeof meta.description === 'string' && meta.description ? ` "${meta.description}"` : ''
      const total = fmt(meta.amount, meta.currency)
      return `${actor} deleted expense${desc}${total ? ' ' + total : ''}${inGroup}`
    }
    case 'settlement_recorded': {
      const from = typeof meta.fromUserName === 'string' ? meta.fromUserName : null
      const to = typeof meta.toUserName === 'string' ? meta.toUserName : null
      const total = fmt(meta.amount, meta.currency)
      const detail = from && to ? ` — ${from} paid ${to}${total ? ' ' + total : ''}` : ''
      return `${actor} recorded a settlement${detail}${inGroup}`
    }
    case 'settlement_deleted': {
      const from = typeof meta.fromUserName === 'string' ? meta.fromUserName : null
      const to = typeof meta.toUserName === 'string' ? meta.toUserName : null
      const total = fmt(meta.amount, meta.currency)
      const detail = from && to ? ` — ${from} paid ${to}${total ? ' ' + total : ''}` : ''
      return `${actor} deleted a settlement${detail}${inGroup}`
    }
    case 'expenses_converted': {
      const currency = typeof meta.targetCurrency === 'string' ? meta.targetCurrency : ''
      const count = typeof meta.converted === 'number' ? meta.converted : null
      const countStr = count !== null ? ` (${count} expense${count !== 1 ? 's' : ''})` : ''
      return `${actor} converted all expenses to ${currency}${countStr}${inGroup}`
    }
    case 'member_joined':
      return groupName ? `${actor} joined ${groupName}` : `${actor} joined the group`
    case 'member_added': {
      const added = typeof meta.addedUserName === 'string' ? meta.addedUserName : 'a user'
      return `${actor} added ${added}${toGroup}`
    }
    case 'member_left':
      return groupName ? `${actor} left ${groupName}` : `${actor} left the group`
    case 'member_removed': {
      const removed = typeof meta.removedUserName === 'string' ? meta.removedUserName : 'a member'
      return `${actor} removed ${removed}${fromGroup}`
    }
    case 'group_created':
      return groupName ? `${actor} created ${groupName}` : `${actor} created the group`
    case 'group_updated': {
      const fields = Array.isArray(meta.changedFields) && meta.changedFields.length > 0
        ? ` (${(meta.changedFields as string[]).join(', ')})`
        : ''
      return `${actor} updated group settings${fields}${inGroup}`
    }
    default:
      return `${actor} did something${inGroup}`
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
