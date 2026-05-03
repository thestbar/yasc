import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
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
    onSuccess: async (data) => {
      setAuth(data.user, data.accessToken)
      await SecureStore.setItemAsync('rt', data.refreshToken)
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      setAuth(data.user, data.accessToken)
      await SecureStore.setItemAsync('rt', data.refreshToken)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const { clear } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      const rt = (await SecureStore.getItemAsync('rt')) ?? ''
      return authApi.logout(rt)
    },
    onSettled: async () => {
      clear()
      await SecureStore.deleteItemAsync('rt')
      qc.clear()
      router.replace('/(auth)/login')
    },
  })
}
