import type { User } from './user'
import type { SplitType } from './expense'

export interface Group {
  id: string
  name: string
  imageUrl: string | null
  startDate: string | null
  endDate: string | null
  maxMembers: number | null
  simplifyDebts: boolean
  defaultSplit: SplitType
  inviteCode: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  user: User
  joinedAt: string
  role: 'owner' | 'member'
}
