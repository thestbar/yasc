import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { UserPlus, Check, X } from 'lucide-react-native'
import {
  useFriends, useFriendRequests, useSendFriendRequest,
  useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend,
} from '../../../lib/hooks/useFriends'
import { useAuthStore } from '../../../lib/store/auth'
import type { Friendship } from '@yasc/types'

function otherUser(f: Friendship, myId: string | undefined) {
  return f.user.id === myId ? f.friend : f.user
}

export default function FriendsScreen() {
  const [search, setSearch] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const me = useAuthStore((s) => s.user)

  const { data: friends = [], isLoading, refetch } = useFriends()
  const { data: requests = [] } = useFriendRequests()
  const sendRequest = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const remove = useRemoveFriend()

  const filtered = friends.filter((f) => {
    const other = otherUser(f, me?.id)
    const q = search.toLowerCase()
    return !q || other.displayName.toLowerCase().includes(q) || other.username.toLowerCase().includes(q)
  })

  const onSend = async () => {
    if (!identifier.trim()) return
    try {
      await sendRequest.mutateAsync(identifier.trim())
      Alert.alert('Sent', 'Friend request sent')
      setIdentifier('')
      setShowAdd(false)
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to send request')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold">Friends</Text>
        <TouchableOpacity onPress={() => setShowAdd((v) => !v)} className="bg-indigo-600 rounded-lg px-3 py-2 flex-row items-center gap-1">
          <UserPlus size={16} color="white" />
          <Text className="text-white text-sm font-medium">Add</Text>
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View className="mx-4 mb-3 flex-row gap-2">
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or username"
            autoCapitalize="none"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-900"
          />
          <TouchableOpacity onPress={onSend} disabled={sendRequest.isPending} className="bg-indigo-600 rounded-xl px-4 items-center justify-center disabled:opacity-50">
            <Text className="text-white font-medium">{sendRequest.isPending ? '…' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {requests.length > 0 && (
        <View className="mx-4 mb-3">
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Pending requests</Text>
          {requests.map((req) => {
            const requester = otherUser(req, me?.id)
            return (
              <View key={req.id} className="flex-row items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 mb-2">
                <View>
                  <Text className="text-sm font-medium">{requester.displayName}</Text>
                  <Text className="text-xs text-gray-500">@{requester.username}</Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => accept.mutate(req.id)} disabled={accept.isPending} className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center disabled:opacity-50">
                    <Check size={16} color="#16a34a" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => decline.mutate(req.id)} disabled={decline.isPending} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center disabled:opacity-50">
                    <X size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {friends.length > 0 && (
        <View className="mx-4 mb-2">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends…"
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-900"
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-4"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const friend = otherUser(item, me?.id)
          return (
            <View className="flex-row items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 mb-2">
              <View>
                <Text className="text-sm font-medium">{friend.displayName}</Text>
                <Text className="text-xs text-gray-500">@{friend.username}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Alert.alert('Remove friend', `Remove ${friend.displayName}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(item.id) },
                ])}
                disabled={remove.isPending}
              >
                <Text className="text-xs text-red-500">Remove</Text>
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Text className="text-gray-500 text-sm">{friends.length === 0 ? 'No friends yet.' : 'No results.'}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
