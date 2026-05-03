import { http } from '../http'
import type { User } from '@yasc/types'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export const authApi = {
  register: (data: { email: string; username: string; displayName: string; password: string }) =>
    http.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    http.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) =>
    http.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    http.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }).then((r) => r.data),

  forgotPassword: (email: string) =>
    http.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    http.post('/auth/reset-password', { token, newPassword }),
}
