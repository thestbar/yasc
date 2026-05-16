import type { User } from './user'
import type { Group } from './group'

export type ActivityType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'expenses_converted'
  | 'settlement_recorded'
  | 'settlement_deleted'
  | 'member_joined'
  | 'member_added'
  | 'member_left'
  | 'member_removed'
  | 'group_created'
  | 'group_updated'

export interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actor: User
  groupId: string | null
  group: Pick<Group, 'id' | 'name'> | null
  expenseId: string | null
  settlementId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}
