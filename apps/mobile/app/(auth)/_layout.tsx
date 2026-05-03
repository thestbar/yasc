import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '../../lib/store/auth'

export default function AuthLayout() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (accessToken) return <Redirect href="/(tabs)/groups" />
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Sign in', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account', headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password', headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ title: 'New password', headerShown: false }} />
    </Stack>
  )
}
