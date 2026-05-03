import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native'
import { useExpense, useDeleteExpense } from '../../../../../../lib/hooks/useExpenses'
import { useGroup } from '../../../../../../lib/hooks/useGroups'
import { useAuthStore } from '../../../../../../lib/store/auth'
import { formatCurrency, formatExpenseDate } from '@yasc/utils'

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: expense, isLoading } = useExpense(id!, expenseId!)
  const { data: group } = useGroup(id!)
  const deleteExpense = useDeleteExpense()

  const canEdit = expense && (expense.createdById === user?.id || expense.paidById === user?.id)

  const onDelete = () => {
    Alert.alert('Delete expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense.mutateAsync({ groupId: id!, expenseId: expenseId! })
            router.back()
          } catch {
            Alert.alert('Error', 'Failed to delete expense')
          }
        },
      },
    ])
  }

  if (!expense) return null

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-xl font-bold">Expense</Text>
        </View>
        {canEdit && (
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${id}/expenses/${expenseId}/edit`)}>
              <Pencil size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} disabled={deleteExpense.isPending}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-4">
          <Text className="text-lg font-semibold">{expense.description}</Text>
          <Text className="text-2xl font-bold text-indigo-600 mt-1">
            {formatCurrency(expense.amount, expense.currency)}
          </Text>

          <View className="mt-4 gap-2">
            {[
              ['Paid by', expense.paidBy?.displayName ?? expense.paidBy?.username],
              ['Date', formatExpenseDate(expense.date)],
              ['Category', expense.category],
              ['Split type', expense.splitType],
            ].map(([label, value]) => (
              <View key={label as string} className="flex-row justify-between">
                <Text className="text-sm text-gray-500">{label}</Text>
                <Text className="text-sm font-medium capitalize">{value as string}</Text>
              </View>
            ))}
          </View>

          {expense.notes && (
            <Text className="mt-4 text-sm text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
              {expense.notes}
            </Text>
          )}
        </View>

        {expense.splits && expense.splits.length > 0 && (
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <Text className="text-sm font-semibold mb-3">Split breakdown</Text>
            {expense.splits.map((split) => (
              <View key={split.id} className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-600 dark:text-gray-400">{split.user?.displayName ?? split.user?.username}</Text>
                <Text className="text-sm font-medium">{formatCurrency(split.amount, expense.currency)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
