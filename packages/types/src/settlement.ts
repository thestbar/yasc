import type { User } from './user'

export interface Settlement {
  id: string
  groupId: string
  fromUser: User
  toUser: User
  amount: number
  currency: string
  date: string
  notes: string | null
  createdAt: string
}
