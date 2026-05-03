import { create } from 'zustand'
import type { User } from '@yasc/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  setToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}))
