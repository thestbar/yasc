import type { User } from './user'
import type { Group } from './group'

export type ActivityType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'settlement_recorded'
  | 'member_joined'
  | 'member_left'
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
