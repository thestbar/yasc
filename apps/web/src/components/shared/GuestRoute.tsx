import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../lib/store/auth'

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [searchParams] = useSearchParams()
  if (accessToken) {
    const redirect = searchParams.get('redirect') ?? '/groups'
    return <Navigate to={redirect} replace />
  }
  return <>{children}</>
}
