import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '../../lib/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type Fields = z.infer<typeof schema>

export default function LoginScreen() {
  const login = useLogin()
  const { control, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data)
      router.replace('/(tabs)/groups')
    } catch {
      // error shown inline
    }
  })

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10">
        <Text className="text-3xl font-bold text-indigo-600 text-center mb-1">YASC</Text>
        <Text className="text-gray-500 text-sm text-center mb-10">Split expenses, not friendships</Text>

        <Text className="text-xl font-semibold mb-6">Sign in</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-1">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
              />
            )}
          />
          {errors.email && <Text className="text-xs text-red-500 mt-1">{errors.email.message}</Text>}
        </View>

        <View className="mb-2">
          <Text className="text-sm font-medium mb-1">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                secureTextEntry
                className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
              />
            )}
          />
          {errors.password && <Text className="text-xs text-red-500 mt-1">{errors.password.message}</Text>}
        </View>

        <Link href="/(auth)/forgot-password" className="text-xs text-indigo-600 text-right mb-6">
          Forgot password?
        </Link>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={login.isPending}
          className="bg-indigo-600 rounded-xl py-3.5 items-center mb-4 disabled:opacity-50"
        >
          <Text className="text-white font-semibold">{login.isPending ? 'Signing in…' : 'Sign in'}</Text>
        </TouchableOpacity>

        {login.error && (
          <Text className="text-xs text-red-500 text-center mb-4">Invalid email or password</Text>
        )}

        <Text className="text-xs text-gray-500 text-center">
          No account?{' '}
          <Link href="/(auth)/register" className="text-indigo-600">Create one</Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
