import axios from 'axios'
import { useAuthStore } from './store/auth'

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string> | null = null

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshing) {
          refreshing = axios
            .post('/api/auth/refresh', { refreshToken: localStorage.getItem('rt') })
            .then((r) => {
              const { accessToken, refreshToken, user } = r.data
              if (user) {
                useAuthStore.getState().setAuth(user, accessToken)
              } else {
                useAuthStore.getState().setToken(accessToken)
              }
              if (refreshToken) localStorage.setItem('rt', refreshToken)
              return accessToken
            })
            .finally(() => { refreshing = null })
        }
        const token = await refreshing
        original.headers.Authorization = `Bearer ${token}`
        return http(original)
      } catch {
        useAuthStore.getState().clear()
        localStorage.removeItem('rt')
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?redirect=${redirect}`
      }
    }
    return Promise.reject(err)
  },
)
