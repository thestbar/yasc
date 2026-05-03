import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groupsApi } from '../../lib/api/groups'
import { useAuthStore } from '../../lib/store/auth'

export default function JoinGroupScreen() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>()
  const user = useAuthStore((s) => s.user)

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['join-preview', inviteCode],
    queryFn: () => groupsApi.joinPreview(inviteCode!),
    enabled: !!inviteCode,
  })

  const join = useMutation({
    mutationFn: () => groupsApi.join(inviteCode!),
    onSuccess: (group) => {
      Alert.alert('Joined!', `You've joined ${group.name}`, [
        { text: 'OK', onPress: () => router.replace(`/(tabs)/groups/${group.id}`) },
      ])
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to join group')
    },
  })

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 items-center justify-center px-6">
        <Text className="text-lg font-semibold mb-2">Join group</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">Sign in to join this group.</Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="bg-indigo-600 rounded-xl py-3 px-8">
          <Text className="text-white font-semibold">Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (error || (!isLoading && !preview)) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 items-center justify-center px-6">
        <Text className="text-sm text-gray-500 text-center">This invite link is invalid or has expired.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-indigo-600">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 justify-center px-6">
      <Text className="text-lg font-semibold mb-1">You're invited!</Text>
      {preview && (
        <>
          <Text className="text-sm text-gray-500 mb-6">Join <Text className="font-semibold text-gray-900 dark:text-gray-100">{preview.name}</Text></Text>
          {preview.description && <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">{preview.description}</Text>}
          <Text className="text-xs text-gray-400 mb-8">{preview.memberCount} member{preview.memberCount !== 1 ? 's' : ''} · {preview.currency}</Text>
        </>
      )}
      <TouchableOpacity
        onPress={() => join.mutate()}
        disabled={join.isPending || isLoading}
        className="bg-indigo-600 rounded-xl py-3.5 items-center disabled:opacity-50"
      >
        <Text className="text-white font-semibold">{join.isPending ? 'Joining…' : `Join ${preview?.name ?? 'group'}`}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} className="mt-3 items-center">
        <Text className="text-sm text-gray-500">Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
