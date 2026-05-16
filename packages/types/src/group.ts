import type { User } from './user'
import type { SplitType } from './expense'

export interface Group {
  id: string
  name: string
  description: string | null
  currency: string
  imageUrl: string | null
  simplifyDebts: boolean
  consolidateCurrencies: boolean
  defaultSplit: SplitType
  inviteCode: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  user: User
  joinedAt: string
  role: 'owner' | 'member'
}
