import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import * as SecureStore from 'expo-secure-store'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Toaster } from 'sonner-native'
import { authApi } from '../lib/api/auth'
import { useAuthStore } from '../lib/store/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function SessionRestore({ children }: { children: React.ReactNode }) {
  const setToken = useAuthStore((s) => s.setToken)

  useEffect(() => {
    SecureStore.getItemAsync('rt').then(async (rt) => {
      if (!rt) return
      try {
        const data = await authApi.refresh(rt)
        setToken(data.accessToken)
        await SecureStore.setItemAsync('rt', data.refreshToken)
      } catch {
        await SecureStore.deleteItemAsync('rt')
      }
    })
  }, [])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionRestore>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="join/[inviteCode]" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </SessionRestore>
        <Toaster />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
