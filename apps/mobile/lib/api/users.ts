import { http } from '../http'
import type { User } from '@yasc/types'

export const usersApi = {
  me: () => http.get<User>('/users/me').then((r) => r.data),

  update: (data: { displayName?: string; username?: string; avatarUrl?: string }) =>
    http.patch<User>('/users/me', data).then((r) => r.data),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    http.patch('/users/me/password', data),

  deleteAccount: () => http.delete('/users/me'),

  search: (q: string) =>
    http.get<User[]>('/users/search', { params: { q } }).then((r) => r.data),
}
