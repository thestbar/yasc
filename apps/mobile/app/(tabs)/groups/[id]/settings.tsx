import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Copy, RefreshCw } from 'lucide-react-native'
import {
  useGroup, useGroupMembers, useUpdateGroup, useDeleteGroup,
  useLeaveGroup, useRegenerateInvite, useRemoveMember,
} from '../../../../lib/hooks/useGroups'
import { useAuthStore } from '../../../../lib/store/auth'

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: group } = useGroup(id!)
  const { data: members = [] } = useGroupMembers(id!)
  const update = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const leaveGroup = useLeaveGroup()
  const regenerate = useRegenerateInvite()
  const removeMember = useRemoveMember()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [simplifyDebts, setSimplifyDebts] = useState(true)

  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description ?? '')
      setSimplifyDebts(group.simplifyDebts)
    }
  }, [group])

  const isOwner = members.find((m) => m.userId === user?.id)?.role === 'owner'

  const onSave = async () => {
    try {
      await update.mutateAsync({ id: id!, data: { name, description: description || undefined, simplifyDebts } })
      Alert.alert('Saved', 'Group updated')
    } catch {
      Alert.alert('Error', 'Failed to update group')
    }
  }

  const onDelete = () => {
    Alert.alert('Delete group', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroup.mutateAsync(id!)
            router.replace('/(tabs)/groups')
          } catch {
            Alert.alert('Error', 'Failed to delete group')
          }
        },
      },
    ])
  }

  const onLeave = () => {
    Alert.alert('Leave group', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup.mutateAsync(id!)
            router.replace('/(tabs)/groups')
          } catch {
            Alert.alert('Error', 'Failed to leave group')
          }
        },
      },
    ])
  }

  const onRegenerate = () => {
    Alert.alert('Regenerate invite link', 'The old link will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: () => regenerate.mutate(id!),
      },
    ])
  }

  const copyInvite = async () => {
    if (!group?.inviteCode) return
    const url = `yasc://join/${group.inviteCode}`
    await Clipboard.setStringAsync(url)
    Alert.alert('Copied', 'Invite link copied to clipboard')
  }

  if (!group) return null

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold flex-1">Group settings</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Edit details (owner only) */}
        {isOwner && (
          <View className="mx-4 mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <Text className="text-sm font-semibold mb-3">Details</Text>
            <View className="mb-3">
              <Text className="text-sm font-medium mb-1">Name</Text>
              <TextInput value={name} onChangeText={setName} className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm" />
            </View>
            <View className="mb-3">
              <Text className="text-sm font-medium mb-1">Description</Text>
              <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={2} className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm" />
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-medium">Simplify debts</Text>
              <Switch value={simplifyDebts} onValueChange={setSimplifyDebts} trackColor={{ true: '#4f46e5' }} />
            </View>
            <TouchableOpacity onPress={onSave} disabled={update.isPending} className="bg-indigo-600 rounded-xl py-2.5 items-center disabled:opacity-50">
              <Text className="text-white font-semibold text-sm">{update.isPending ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Invite link */}
        <View className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <Text className="text-sm font-semibold mb-3">Invite link</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={group.inviteCode ? `yasc://join/${group.inviteCode}` : ''}
              editable={false}
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-500"
            />
            <TouchableOpacity onPress={copyInvite} className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 items-center justify-center">
              <Copy size={16} color="#6b7280" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={onRegenerate} disabled={regenerate.isPending} className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 items-center justify-center disabled:opacity-50">
                <RefreshCw size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Members */}
        <View className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <Text className="text-sm font-semibold mb-3">Members</Text>
          {members.map((m) => (
            <View key={m.userId} className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-sm font-medium">{m.user?.displayName ?? m.user?.username}</Text>
                <Text className="text-xs text-gray-500">@{m.user?.username} · {m.role}</Text>
              </View>
              {isOwner && m.userId !== user?.id && (
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove member', `Remove ${m.user?.displayName}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeMember.mutate({ groupId: id!, userId: m.userId }) },
                  ])}
                  className="px-2 py-1"
                >
                  <Text className="text-xs text-red-500">Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Danger zone */}
        <View className="mx-4 mt-3 mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-4">
          <Text className="text-sm font-semibold text-red-600 mb-3">Danger zone</Text>
          {!isOwner && (
            <TouchableOpacity onPress={onLeave} className="py-1">
              <Text className="text-sm text-red-600">Leave group</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity onPress={onDelete} className="py-1">
              <Text className="text-sm text-red-600">Delete group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
