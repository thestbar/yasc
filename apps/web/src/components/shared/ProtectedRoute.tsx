import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../lib/store/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const rt = localStorage.getItem('rt')
  if (!accessToken && !rt) {
    return <Navigate to="/auth/login" replace />
  }
  return <>{children}</>
}
