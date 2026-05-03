import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { authApi } from '../../lib/api/auth'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
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
        <Text className="text-xl font-semibold mb-2">Reset password</Text>

        {sent ? (
          <View>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              If an account exists for <Text className="font-semibold">{email}</Text>, you'll receive a reset link shortly.
            </Text>
            <Link href="/(auth)/login" className="text-indigo-600 text-sm text-center">Back to sign in</Link>
          </View>
        ) : (
          <View>
            <Text className="text-sm text-gray-500 mb-4">Enter your email and we'll send a reset link.</Text>
            <View className="mb-4">
              <Text className="text-sm font-medium mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
              />
            </View>
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              className="bg-indigo-600 rounded-xl py-3.5 items-center mb-4 disabled:opacity-50"
            >
              <Text className="text-white font-semibold">{loading ? 'Sending…' : 'Send reset link'}</Text>
            </TouchableOpacity>
            <Link href="/(auth)/login" className="text-xs text-gray-500 text-center">Back to sign in</Link>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
