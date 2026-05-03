import type { User } from './user'

export type SplitType = 'equal' | 'percentage' | 'exact' | 'shares'

export type ExpenseCategory =
  | 'general'
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'other'

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  currency: string
  date: string
  category: ExpenseCategory
  paidById: string
  paidBy: User
  splitType: SplitType
  splits: ExpenseSplit[]
  receiptUrl: string | null
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseSplit {
  id: string
  expenseId: string
  userId: string
  user: User
  amount: number
  percentage: number | null
  shares: number | null
  settled: boolean
}
