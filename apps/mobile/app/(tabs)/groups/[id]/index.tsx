import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Plus, Settings, ChevronLeft } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useGroup, useGroupBalances } from '../../../../lib/hooks/useGroups'
import { useGroupExpenses } from '../../../../lib/hooks/useExpenses'
import { useCreateSettlement } from '../../../../lib/hooks/useSettlements'
import { useAuthStore } from '../../../../lib/store/auth'
import { formatCurrency, formatExpenseDate } from '@yasc/utils'

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: group, isLoading: loadingGroup, refetch } = useGroup(id!)
  const { data: expenses = [], isLoading: loadingExpenses } = useGroupExpenses(id!)
  const { data: balances = [] } = useGroupBalances(id!)
  const settle = useCreateSettlement()

  const handleSettle = (toUserId: string, toUserName: string, amount: number) => {
    if (!group || !user) return
    Alert.alert(
      'Settle up',
      `Record payment of ${formatCurrency(amount, group.currency)} to ${toUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: () => settle.mutate({
            groupId: id!,
            fromUserId: user.id,
            toUserId,
            amount,
            currency: group.currency,
            date: new Date().toISOString().slice(0, 10),
          }),
        },
      ],
    )
  }

  if (!group && !loadingGroup) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 items-center justify-center">
        <Text className="text-gray-500">Group not found.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <View className="flex-row items-center gap-2 flex-1">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-xl font-bold" numberOfLines={1}>{group?.name ?? '…'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${id}/settings`)}>
          <Settings size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={loadingGroup || loadingExpenses} onRefresh={refetch} />}
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <>
            {/* Balances */}
            {balances.length > 0 && (
              <View className="mx-4 mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <Text className="text-sm font-semibold mb-3">Balances</Text>
                {balances.map((b, i) => (
                  <View key={i} className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      <Text className="font-medium">{b.fromUserName}</Text>
                      {' owes '}
                      <Text className="font-medium">{b.toUserName}</Text>
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-red-500">
                        {group ? formatCurrency(b.amount, group.currency) : ''}
                      </Text>
                      {b.fromUserId === user?.id && (
                        <TouchableOpacity
                          onPress={() => handleSettle(b.toUserId, b.toUserName, b.amount)}
                          className="bg-indigo-600 rounded-md px-2 py-1"
                        >
                          <Text className="text-white text-xs">Settle</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Expenses header */}
            <View className="flex-row items-center justify-between mx-4 mt-4 mb-2">
              <Text className="text-sm font-semibold">Expenses</Text>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/groups/${id}/expenses/new`)}
                className="bg-indigo-600 rounded-lg px-2.5 py-1.5 flex-row items-center gap-1"
              >
                <Plus size={14} color="white" />
                <Text className="text-white text-xs">Add</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/groups/${id}/expenses/${item.id}`)}
            className="mx-4 mb-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-medium text-sm" numberOfLines={1}>{item.description}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {item.paidBy?.displayName ?? item.paidBy?.username} · {formatExpenseDate(item.date)}
                </Text>
              </View>
              <Text className="font-semibold text-sm shrink-0">
                {formatCurrency(item.amount, item.currency)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loadingExpenses ? (
            <View className="items-center py-12">
              <Text className="text-gray-500 text-sm">No expenses yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
