import { http } from '../http'
import type { Friendship } from '@yasc/types'

export const friendsApi = {
  list: () => http.get<Friendship[]>('/friends').then((r) => r.data),

  requests: () => http.get<Friendship[]>('/friends/requests').then((r) => r.data),

  sendRequest: (identifier: string) =>
    http.post<Friendship>('/friends/request', { identifier }).then((r) => r.data),

  accept: (id: string) =>
    http.post<Friendship>(`/friends/request/${id}/accept`).then((r) => r.data),

  decline: (id: string) =>
    http.post(`/friends/request/${id}/decline`),

  remove: (id: string) =>
    http.delete(`/friends/${id}`),
}
