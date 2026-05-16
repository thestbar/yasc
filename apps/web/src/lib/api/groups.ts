import { http } from '../http'
import type { Group, GroupMember } from '@yasc/types'

export interface CreateGroupData {
  name: string
  description?: string
  currency?: string
  simplifyDebts?: boolean
  consolidateCurrencies?: boolean
}

export interface JoinPreviewResponse {
  id: string
  name: string
  description?: string
  currency: string
  memberCount: number
}

export interface BalanceEntry {
  userId: string
  userName: string
  amount: number
  currency: string
}

export interface SimplifiedDebt {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
  currency: string
}

export interface GroupBalances {
  balances: BalanceEntry[]
  simplifiedDebts: SimplifiedDebt[]
}

export const groupsApi = {
  list: () => http.get<Group[]>('/groups').then((r) => r.data),

  create: (data: CreateGroupData) =>
    http.post<Group>('/groups', data).then((r) => r.data),

  get: (id: string) =>
    http.get<Group>(`/groups/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CreateGroupData>) =>
    http.patch<Group>(`/groups/${id}`, data).then((r) => r.data),

  delete: (id: string) => http.delete(`/groups/${id}`),

  members: (id: string) =>
    http.get<GroupMember[]>(`/groups/${id}/members`).then((r) => r.data),

  addMember: (id: string, data: { userId?: string; email?: string; username?: string }) =>
    http.post<GroupMember>(`/groups/${id}/members`, data).then((r) => r.data),

  removeMember: (id: string, userId: string) =>
    http.delete(`/groups/${id}/members/${userId}`),

  leave: (id: string) => http.post(`/groups/${id}/leave`),

  regenerateInvite: (id: string) =>
    http.post<{ inviteCode: string }>(`/groups/${id}/invite/regenerate`).then((r) => r.data),

  joinPreview: (inviteCode: string) =>
    http.get<JoinPreviewResponse>(`/groups/join/${inviteCode}`).then((r) => r.data),

  join: (inviteCode: string) =>
    http.post<Group>(`/groups/join/${inviteCode}`).then((r) => r.data),

  balances: (id: string) =>
    http.get<GroupBalances>(`/groups/${id}/balances`).then((r) => r.data),

  convertAllPreview: (id: string) =>
    http.get<{ groupCurrency: string; breakdown: { currency: string; count: number }[] }>(
      `/groups/${id}/expenses/convert-all/preview`
    ).then((r) => r.data),

  convertAll: (id: string) =>
    http.post<{ converted: number; skipped: number; total: number }>(
      `/groups/${id}/expenses/convert-all`
    ).then((r) => r.data),
}
