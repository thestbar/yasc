import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { authApi } from '../../lib/api/auth'

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match'); return }
    if (password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token ?? '', password)
      Alert.alert('Success', 'Password reset! Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ])
    } catch {
      Alert.alert('Error', 'Token invalid or expired')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-950 px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center">
        <Text className="text-xl font-semibold mb-6">Set new password</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-1">New password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium mb-1">Confirm new password</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
          />
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={loading || !token}
          className="bg-indigo-600 rounded-xl py-3.5 items-center disabled:opacity-50"
        >
          <Text className="text-white font-semibold">{loading ? 'Saving…' : 'Set password'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
