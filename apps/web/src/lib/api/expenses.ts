import { http } from '../http'
import type { Expense, PaginatedResponse } from '@yasc/types'

export interface SplitInput {
  userId: string
  amount: number
  percentage?: number
  shares?: number
}

export interface CreateExpenseData {
  description: string
  amount: number
  currency: string
  date: string
  category: string
  paidById: string
  splitType: string
  splits: SplitInput[]
  receiptUrl?: string
  notes?: string
}

export const expensesApi = {
  list: (groupId: string, params?: { page?: number; limit?: number; category?: string; paidById?: string; dateFrom?: string; dateTo?: string }) =>
    http.get<PaginatedResponse<Expense>>(`/groups/${groupId}/expenses`, { params }).then((r) => r.data),

  create: (groupId: string, data: CreateExpenseData) =>
    http.post<Expense>(`/groups/${groupId}/expenses`, data).then((r) => r.data),

  get: (groupId: string, id: string) =>
    http.get<Expense>(`/groups/${groupId}/expenses/${id}`).then((r) => r.data),

  update: (groupId: string, id: string, data: CreateExpenseData) =>
    http.patch<Expense>(`/groups/${groupId}/expenses/${id}`, data).then((r) => r.data),

  delete: (groupId: string, id: string) =>
    http.delete(`/groups/${groupId}/expenses/${id}`),

  convert: (groupId: string, id: string, targetCurrency: string) =>
    http.post<Expense>(`/groups/${groupId}/expenses/${id}/convert`, { targetCurrency }).then((r) => r.data),
}
