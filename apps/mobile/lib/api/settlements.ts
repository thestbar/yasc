import { http } from '../http'
import type { Settlement } from '@yasc/types'

export interface CreateSettlementData {
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  date: string
  notes?: string
}

export const settlementsApi = {
  list: (groupId: string) =>
    http.get<Settlement[]>(`/groups/${groupId}/settlements`).then((r) => r.data),

  create: (groupId: string, data: CreateSettlementData) =>
    http.post<Settlement>(`/groups/${groupId}/settlements`, data).then((r) => r.data),

  delete: (groupId: string, id: string) =>
    http.delete(`/groups/${groupId}/settlements/${id}`),
}
