import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useActivity } from '../../../lib/hooks/useActivity'
import { formatRelativeTime } from '@yasc/utils'
import type { ActivityItem } from '@yasc/types'

function activityText(item: ActivityItem): string {
  const actor = item.actor?.displayName ?? item.actor?.username ?? 'Someone'
  const group = item.group?.name ? ` in ${item.group.name}` : ''
  switch (item.type) {
    case 'expense_added': return `${actor} added an expense${group}`
    case 'expense_updated': return `${actor} updated an expense${group}`
    case 'expense_deleted': return `${actor} deleted an expense${group}`
    case 'settlement_recorded': return `${actor} recorded a settlement${group}`
    case 'member_joined': return `${actor} joined${group}`
    case 'member_left': return `${actor} left${group}`
    case 'group_created': return `${actor} created a group`
    case 'group_updated': return `${actor} updated${group}`
    default: return `${actor} did something${group}`
  }
}

export default function ActivityScreen() {
  const [page, setPage] = useState(1)
  const { data, isLoading, refetch } = useActivity({ page, limit: 20 })
  const items = data?.data ?? []
  const hasMore = data?.hasMore ?? false

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="px-4 py-3">
        <Text className="text-xl font-bold">Activity</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-6"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { setPage(1); refetch() }} />}
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 mb-1">
            <Text className="text-sm">{activityText(item)}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(item.createdAt)}</Text>
          </View>
        )}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity onPress={() => setPage((p) => p + 1)} className="py-3 items-center">
              <Text className="text-indigo-600 text-sm">Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-16">
              <Text className="text-gray-500 text-sm">No activity yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
