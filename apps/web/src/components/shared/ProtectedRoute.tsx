import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../lib/store/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}
