import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Plus, Settings, ChevronLeft, ArrowRightLeft } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { toast } from 'sonner-native'
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
  const { data: balanceData } = useGroupBalances(id!)
  const settle = useCreateSettlement()

  const simplifiedDebts = balanceData?.simplifiedDebts ?? []
  const rawBalances = balanceData?.balances ?? []
  const showDebts = group?.simplifyDebts ?? false
  const hasBalances = showDebts ? simplifiedDebts.length > 0 : rawBalances.length > 0

  const handleSettle = async (toUserId: string, toUserName: string, amount: number, currency: string) => {
    if (!group || !user) return
    try {
      await settle.mutateAsync({
        groupId: id!,
        fromUserId: user.id,
        toUserId,
        amount,
        currency,
        date: new Date().toISOString().slice(0, 10),
      })
      toast.success(`Settled up with ${toUserName}`)
    } catch {
      toast.error('Failed to record settlement')
    }
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
          <View className="flex-1">
            <Text className="text-xl font-bold" numberOfLines={1}>{group?.name ?? '…'}</Text>
            <Text className="text-xs text-gray-500">{group?.currency}</Text>
          </View>
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
            {hasBalances && (
              <View className="mx-4 mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <Text className="text-sm font-semibold mb-3">Balances</Text>

                {showDebts ? (
                  <>
                    {simplifiedDebts.map((d, i) => (
                      <View key={i} className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1 mr-2">
                          <Text className="font-medium">{d.fromUserName}</Text>
                          {' owes '}
                          <Text className="font-medium">{d.toUserName}</Text>
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text className={`text-sm font-semibold ${
                            d.toUserId === user?.id ? 'text-green-600' :
                            d.fromUserId === user?.id ? 'text-red-500' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {formatCurrency(d.amount, d.currency)}
                          </Text>
                          {d.fromUserId === user?.id && (
                            <TouchableOpacity
                              onPress={() => handleSettle(d.toUserId, d.toUserName, d.amount, d.currency)}
                              disabled={settle.isPending}
                              className="flex-row items-center gap-1 bg-indigo-600 rounded-md px-2 py-1"
                            >
                              <ArrowRightLeft size={11} color="white" />
                              <Text className="text-white text-xs">Settle</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <>
                    {rawBalances.map((b, i) => (
                      <View key={i} className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.userName}</Text>
                        <Text className={`text-sm font-semibold ${b.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {b.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(b.amount), b.currency)}
                          {b.currency !== group?.currency && (
                            <Text className="text-gray-400 font-normal"> {b.currency}</Text>
                          )}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
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
                  Paid by {item.paidBy?.displayName ?? item.paidBy?.username} · {formatExpenseDate(item.date)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-semibold text-sm">{formatCurrency(item.amount, item.currency)}</Text>
                {item.originalCurrency && item.originalCurrency !== item.currency && (
                  <Text className="text-xs text-gray-400">{formatCurrency(item.originalAmount!, item.originalCurrency)}</Text>
                )}
              </View>
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
