import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from './store/auth'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost/api'

export const http = axios.create({ baseURL: BASE_URL })

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string> | null = null

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true
    try {
      if (!refreshPromise) {
        const rt = await SecureStore.getItemAsync('rt')
        refreshPromise = http
          .post('/auth/refresh', { refreshToken: rt })
          .then((r) => {
            const { accessToken, refreshToken } = r.data
            useAuthStore.getState().setToken(accessToken)
            SecureStore.setItemAsync('rt', refreshToken)
            return accessToken
          })
          .finally(() => { refreshPromise = null })
      }
      const token = await refreshPromise
      original.headers.Authorization = `Bearer ${token}`
      return http(original)
    } catch {
      useAuthStore.getState().clear()
      SecureStore.deleteItemAsync('rt')
      return Promise.reject(error)
    }
  },
)
