import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { useAuthStore } from '../store/auth'

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['me'],
    queryFn: usersApi.me,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      localStorage.setItem('rt', data.refreshToken)
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      localStorage.setItem('rt', data.refreshToken)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const { clear } = useAuthStore()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => {
      const rt = localStorage.getItem('rt') ?? ''
      return authApi.logout(rt)
    },
    onSettled: () => {
      clear()
      localStorage.removeItem('rt')
      qc.clear()
      navigate('/auth/login')
    },
  })
}
