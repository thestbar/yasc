import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../../lib/store/auth'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setAuth, clear } = useAuthStore()
  const [ready, setReady] = useState(!!accessToken || !localStorage.getItem('rt'))

  useEffect(() => {
    if (ready) return
    const rt = localStorage.getItem('rt')
    if (!rt) { setReady(true); return }

    axios.post('/api/auth/refresh', { refreshToken: rt })
      .then((r) => {
        setAuth(r.data.user, r.data.accessToken)
        if (r.data.refreshToken) localStorage.setItem('rt', r.data.refreshToken)
      })
      .catch(() => {
        clear()
        localStorage.removeItem('rt')
      })
      .finally(() => setReady(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
