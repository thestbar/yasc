import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Pencil, Trash2, RefreshCw } from 'lucide-react-native'
import { toast } from 'sonner-native'
import { useExpense, useDeleteExpense, useConvertExpense, useConvertPreview } from '../../../../../../lib/hooks/useExpenses'
import { useGroup } from '../../../../../../lib/hooks/useGroups'
import { useAuthStore } from '../../../../../../lib/store/auth'
import { formatCurrency, formatExpenseDate, CURRENCIES } from '@yasc/utils'

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: expense } = useExpense(id!, expenseId!)
  const { data: group } = useGroup(id!)
  const deleteExpense = useDeleteExpense()
  const convertExpense = useConvertExpense()

  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertTarget, setConvertTarget] = useState('')

  const sameAsCurrent = convertTarget === expense?.currency
  const { data: preview, isFetching: previewLoading, error: previewError } = useConvertPreview(
    showConvertModal ? id! : '',
    showConvertModal ? expenseId! : '',
    showConvertModal && !sameAsCurrent ? convertTarget : '',
  )

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
            toast.error('Failed to delete expense')
          }
        },
      },
    ])
  }

  const openConvertModal = () => {
    setConvertTarget(group?.currency ?? expense?.currency ?? 'USD')
    setShowConvertModal(true)
  }

  const handleConvert = async () => {
    if (!convertTarget || !preview) return
    try {
      await convertExpense.mutateAsync({ groupId: id!, expenseId: expenseId!, targetCurrency: convertTarget })
      toast.success(`Converted to ${convertTarget}`)
      setShowConvertModal(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Currency conversion failed')
    }
  }

  if (!expense) return null

  const wasConverted = expense.originalCurrency && expense.originalCurrency !== expense.currency

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
            <TouchableOpacity onPress={openConvertModal}>
              <RefreshCw size={20} color="#6b7280" />
            </TouchableOpacity>
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

          {wasConverted && expense.originalCurrency && expense.originalAmount != null && expense.exchangeRate != null && (
            <View className="mt-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
              <Text className="text-xs text-gray-500">
                Originally <Text className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(expense.originalAmount, expense.originalCurrency)}</Text>
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Converted at 1 {expense.originalCurrency} = {expense.exchangeRate.toFixed(4)} {expense.currency}
              </Text>
            </View>
          )}

          <View className="mt-4 gap-2">
            {([
              ['Paid by', expense.paidBy?.displayName ?? expense.paidBy?.username],
              ['Date', formatExpenseDate(expense.date)],
              ['Category', expense.category],
              ['Split type', expense.splitType],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} className="flex-row justify-between">
                <Text className="text-sm text-gray-500">{label}</Text>
                <Text className="text-sm font-medium capitalize">{value}</Text>
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
                <Text className="text-sm font-medium">
                  {formatCurrency(split.amount, expense.currency)}
                  {expense.splitType === 'percentage' && split.percentage != null && (
                    <Text className="text-gray-400"> ({split.percentage.toFixed(1)}%)</Text>
                  )}
                  {expense.splitType === 'shares' && split.shares != null && (
                    <Text className="text-gray-400"> ({split.shares} shares)</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Convert currency modal */}
      <Modal visible={showConvertModal} transparent animationType="fade" onRequestClose={() => setShowConvertModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full">
            <Text className="text-base font-semibold mb-4">Convert currency</Text>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1">Current amount</Text>
              <Text className="text-sm font-semibold">{formatCurrency(expense.amount, expense.currency)}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-sm font-medium mb-2">Convert to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setConvertTarget(c.code)}
                    className={`px-3 py-1.5 rounded-lg mr-2 border ${convertTarget === c.code ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700'}`}
                  >
                    <Text className={`text-xs font-medium ${convertTarget === c.code ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}>{c.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {!sameAsCurrent && (
              <View className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                {previewLoading ? (
                  <Text className="text-gray-400 text-xs">Fetching rate…</Text>
                ) : previewError ? (
                  <Text className="text-red-500 text-xs">Rate unavailable for this currency pair</Text>
                ) : preview ? (
                  <>
                    <Text className="text-xs text-gray-500">Exchange rate</Text>
                    <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      1 {preview.from} = {preview.rate.toFixed(6)} {preview.to}
                    </Text>
                    <Text className="text-xs text-gray-500">Converted amount</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(preview.convertedAmount, preview.to)}
                    </Text>
                  </>
                ) : null}
              </View>
            )}

            {sameAsCurrent && (
              <Text className="text-xs text-amber-600 dark:text-amber-400 mb-4">Already in {convertTarget}</Text>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowConvertModal(false)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl py-2.5 items-center"
              >
                <Text className="text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConvert}
                disabled={convertExpense.isPending || sameAsCurrent || previewLoading || !!previewError || !preview}
                className="flex-1 bg-indigo-600 rounded-xl py-2.5 items-center disabled:opacity-50"
              >
                <Text className="text-white text-sm font-semibold">{convertExpense.isPending ? 'Converting…' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
