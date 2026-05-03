import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useGroups } from '../../../lib/hooks/useGroups'

export default function GroupsScreen() {
  const { data: groups = [], isLoading, refetch } = useGroups()

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold">Groups</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/groups/new')}
          className="bg-indigo-600 rounded-lg px-3 py-2 flex-row items-center gap-1"
        >
          <Plus size={16} color="white" />
          <Text className="text-white text-sm font-medium">New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-4"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/groups/${item.id}`)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-2"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-semibold">{item.name}</Text>
                {item.description && (
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{item.description}</Text>
                )}
              </View>
              <Text className="text-xs text-gray-400">{item.currency}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-16">
              <Text className="text-gray-500 text-sm">No groups yet.</Text>
              <Text className="text-gray-400 text-xs mt-1">Create one to start splitting expenses.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
