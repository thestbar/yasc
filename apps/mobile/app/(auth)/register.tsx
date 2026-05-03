import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRegister } from '../../lib/hooks/useAuth'
import { isValidUsername, isValidEmail } from '@yasc/utils'

const schema = z.object({
  email: z.string().refine(isValidEmail, 'Invalid email'),
  username: z.string().refine(isValidUsername, 'Username must be 3–20 alphanumeric chars or underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type Fields = z.infer<typeof schema>

const field = (label: string, props: object) => ({ label, ...props })

export default function RegisterScreen() {
  const register_ = useRegister()
  const { control, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const onSubmit = handleSubmit(async ({ confirmPassword: _, ...data }) => {
    try {
      await register_.mutateAsync(data)
      router.replace('/(tabs)/groups')
    } catch {
      // error shown inline
    }
  })

  const FieldInput = ({ name, label, secureTextEntry = false, keyboardType = 'default' as any, autoCapitalize = 'sentences' as any }: {
    name: keyof Fields; label: string; secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any
  }) => (
    <View className="mb-4">
      <Text className="text-sm font-medium mb-1">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value as string}
            onChangeText={onChange}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-transparent"
          />
        )}
      />
      {errors[name] && <Text className="text-xs text-red-500 mt-1">{errors[name]?.message as string}</Text>}
    </View>
  )

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="px-6 py-10">
        <Text className="text-3xl font-bold text-indigo-600 text-center mb-10">YASC</Text>
        <Text className="text-xl font-semibold mb-6">Create account</Text>

        <FieldInput name="email" label="Email" keyboardType="email-address" autoCapitalize="none" />
        <FieldInput name="username" label="Username" autoCapitalize="none" />
        <FieldInput name="displayName" label="Display name" />
        <FieldInput name="password" label="Password" secureTextEntry />
        <FieldInput name="confirmPassword" label="Confirm password" secureTextEntry />

        {register_.error && (
          <Text className="text-xs text-red-500 mb-4">{(register_.error as any)?.response?.data?.message ?? 'Registration failed'}</Text>
        )}

        <TouchableOpacity
          onPress={onSubmit}
          disabled={register_.isPending}
          className="bg-indigo-600 rounded-xl py-3.5 items-center mb-4 disabled:opacity-50"
        >
          <Text className="text-white font-semibold">{register_.isPending ? 'Creating account…' : 'Create account'}</Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-500 text-center">
          Already have an account?{' '}
          <Link href="/(auth)/login" className="text-indigo-600">Sign in</Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
