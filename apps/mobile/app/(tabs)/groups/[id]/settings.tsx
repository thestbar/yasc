import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Modal } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Copy, RefreshCw, UserPlus } from 'lucide-react-native'
import { toast } from 'sonner-native'
import {
  useGroup, useGroupMembers, useUpdateGroup, useDeleteGroup,
  useLeaveGroup, useRegenerateInvite, useRemoveMember,
  useAddMember, useConvertAll, useConvertAllPreview,
} from '../../../../lib/hooks/useGroups'
import { useAuthStore } from '../../../../lib/store/auth'
import { CURRENCIES } from '@yasc/utils'

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
  const addMember = useAddMember()
  const convertAll = useConvertAll()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [simplifyDebts, setSimplifyDebts] = useState(true)
  const [consolidateCurrencies, setConsolidateCurrencies] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const { data: convertPreview, isFetching: previewLoading } = useConvertAllPreview(id!, showConvertModal)

  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description ?? '')
      setCurrency(group.currency)
      setSimplifyDebts(group.simplifyDebts)
      setConsolidateCurrencies((group as any).consolidateCurrencies ?? false)
    }
  }, [group])

  const isOwner = members.find((m) => m.userId === user?.id)?.role === 'owner'

  const onSave = async () => {
    try {
      await update.mutateAsync({ id: id!, data: { name, description: description || undefined, currency, simplifyDebts, consolidateCurrencies } })
      toast.success('Group updated')
    } catch {
      toast.error('Failed to update group')
    }
  }

  const onAddMember = async () => {
    const q = addQuery.trim()
    if (!q) return
    try {
      await addMember.mutateAsync({ groupId: id!, query: q })
      toast.success(`Added ${q} to the group`)
      setAddQuery('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'User not found')
    }
  }

  const onDelete = async () => {
    try {
      await deleteGroup.mutateAsync(id!)
      router.replace('/(tabs)/groups')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete group')
      setShowDeleteModal(false)
    }
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
            toast.error('Failed to leave group')
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
        onPress: async () => {
          try {
            await regenerate.mutateAsync(id!)
            toast.success('New invite link generated')
          } catch {
            toast.error('Failed to regenerate link')
          }
        },
      },
    ])
  }

  const onConvertAll = async () => {
    try {
      const result = await convertAll.mutateAsync(id!)
      toast.success(`Converted ${result.converted} expense${result.converted !== 1 ? 's' : ''} to ${group?.currency}`)
      setShowConvertModal(false)
    } catch {
      toast.error('Failed to convert expenses')
    }
  }

  const copyInvite = async () => {
    if (!group?.inviteCode) return
    const url = `yasc://join/${group.inviteCode}`
    await Clipboard.setStringAsync(url)
    toast.success('Invite link copied')
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
            <View className="mb-3">
              <Text className="text-sm font-medium mb-2">Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    className={`px-3 py-1.5 rounded-lg mr-2 border ${currency === c.code ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700'}`}
                  >
                    <Text className={`text-xs font-medium ${currency === c.code ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}>{c.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-medium">Simplify debts</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Reduce the number of transactions needed to settle up</Text>
              </View>
              <Switch value={simplifyDebts} onValueChange={setSimplifyDebts} trackColor={{ true: '#4f46e5' }} />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-sm font-medium">Auto-convert currencies</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Automatically convert expenses to {group.currency}</Text>
              </View>
              <Switch value={consolidateCurrencies} onValueChange={setConsolidateCurrencies} trackColor={{ true: '#4f46e5' }} />
            </View>
            <TouchableOpacity onPress={onSave} disabled={update.isPending} className="bg-indigo-600 rounded-xl py-2.5 items-center disabled:opacity-50">
              <Text className="text-white font-semibold text-sm">{update.isPending ? 'Saving…' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bulk currency conversion (owner only) */}
        {isOwner && (
          <View className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <Text className="text-sm font-semibold mb-1">Currency conversion</Text>
            <Text className="text-xs text-gray-500 mb-3">
              Convert all expenses not in <Text className="font-medium">{group.currency}</Text> using live exchange rates.
            </Text>
            <TouchableOpacity
              onPress={() => setShowConvertModal(true)}
              className="flex-row items-center gap-2 bg-indigo-600 rounded-xl px-4 py-2.5 self-start"
            >
              <RefreshCw size={14} color="white" />
              <Text className="text-white text-sm font-medium">Convert all to {group.currency}</Text>
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

          {isOwner && (
            <View className="flex-row gap-2 mb-4">
              <TextInput
                value={addQuery}
                onChangeText={setAddQuery}
                placeholder="Username or email"
                autoCapitalize="none"
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
              <TouchableOpacity
                onPress={onAddMember}
                disabled={!addQuery.trim() || addMember.isPending}
                className="bg-indigo-600 rounded-xl px-3 items-center justify-center disabled:opacity-50"
              >
                <UserPlus size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}

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
                    {
                      text: 'Remove', style: 'destructive',
                      onPress: async () => {
                        try {
                          await removeMember.mutateAsync({ groupId: id!, userId: m.userId })
                          toast.success(`${m.user?.displayName ?? m.user?.username} was removed`)
                        } catch {
                          toast.error('Failed to remove member')
                        }
                      },
                    },
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
            <TouchableOpacity onPress={() => { setDeleteConfirmText(''); setShowDeleteModal(true) }} className="py-1">
              <Text className="text-sm text-red-600">Delete group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Convert-all modal */}
      <Modal visible={showConvertModal} transparent animationType="fade" onRequestClose={() => setShowConvertModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full">
            <Text className="text-base font-semibold mb-2">Convert all expenses to {group.currency}</Text>
            <Text className="text-sm text-gray-500 mb-4">
              This will convert every expense not already in {group.currency} using live exchange rates. Original amounts are preserved.
            </Text>

            {previewLoading ? (
              <View className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 mb-4" />
            ) : convertPreview && convertPreview.breakdown?.length > 0 ? (
              <View className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                <Text className="text-xs font-medium text-gray-500 mb-2">Expenses to convert</Text>
                {convertPreview.breakdown.map((row) => (
                  <View key={row.currency} className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">{row.currency}</Text>
                    <Text className="text-sm font-medium">{row.count} expense{row.count !== 1 ? 's' : ''}</Text>
                  </View>
                ))}
              </View>
            ) : convertPreview?.breakdown?.length === 0 ? (
              <View className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                <Text className="text-sm text-gray-500">All expenses are already in {group.currency}.</Text>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowConvertModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 items-center"
              >
                <Text className="text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConvertAll}
                disabled={convertAll.isPending || previewLoading || convertPreview?.breakdown?.length === 0}
                className="flex-1 bg-indigo-600 rounded-xl py-2.5 items-center disabled:opacity-50"
              >
                <Text className="text-white text-sm font-semibold">{convertAll.isPending ? 'Converting…' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full">
            <Text className="text-base font-semibold mb-1">Delete group</Text>
            <Text className="text-sm text-gray-500 mb-4">
              This will permanently delete <Text className="font-medium text-gray-800 dark:text-gray-200">{group.name}</Text> and all its expenses. Type <Text className="font-mono font-bold text-red-600">DELETE</Text> to confirm.
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              autoCapitalize="characters"
              className="border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono mb-4"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 items-center"
              >
                <Text className="text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleteGroup.isPending}
                className="flex-1 bg-red-600 rounded-xl py-2.5 items-center disabled:opacity-50"
              >
                <Text className="text-white text-sm font-semibold">{deleteGroup.isPending ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
