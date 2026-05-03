import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useGroup, useGroupMembers } from '../../../../../lib/hooks/useGroups'
import { useCreateExpense } from '../../../../../lib/hooks/useExpenses'
import { useAuthStore } from '../../../../../lib/store/auth'
import type { SplitType } from '@yasc/types'

const CATEGORIES = ['food', 'transport', 'accommodation', 'entertainment', 'shopping', 'utilities', 'health', 'other'] as const

export default function NewExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: group } = useGroup(id!)
  const { data: members = [] } = useGroupMembers(id!)
  const createExpense = useCreateExpense()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState(user?.id ?? '')
  const [category, setCategory] = useState<string>('other')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const onSubmit = async () => {
    if (!description.trim()) { Alert.alert('Error', 'Description is required'); return }
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) { Alert.alert('Error', 'Enter a valid amount'); return }

    const amountCents = Math.round(amountNum * 100)
    const memberIds = members.map((m) => m.userId)

    let splitInputs: { userId: string; amount: number; percentage?: number; shares?: number }[]
    if (splitType === 'equal') {
      const perPerson = Math.floor(amountCents / memberIds.length)
      const remainder = amountCents % memberIds.length
      splitInputs = memberIds.map((uid, i) => ({ userId: uid, amount: perPerson + (i < remainder ? 1 : 0) }))
    } else if (splitType === 'exact') {
      splitInputs = memberIds.map((uid) => ({ userId: uid, amount: Math.round(parseFloat(splits[uid] || '0') * 100) }))
    } else if (splitType === 'percentage') {
      splitInputs = memberIds.map((uid) => ({
        userId: uid,
        amount: Math.round(amountCents * parseFloat(splits[uid] || '0') / 100),
        percentage: parseFloat(splits[uid] || '0'),
      }))
    } else {
      const totalShares = memberIds.reduce((s, uid) => s + parseFloat(splits[uid] || '0'), 0)
      splitInputs = memberIds.map((uid) => ({
        userId: uid,
        amount: totalShares > 0 ? Math.round(amountCents * parseFloat(splits[uid] || '0') / totalShares) : 0,
        shares: parseFloat(splits[uid] || '0'),
      }))
    }

    try {
      await createExpense.mutateAsync({
        groupId: id!,
        description: description.trim(),
        amount: amountCents,
        currency: group?.currency ?? 'USD',
        paidById,
        category,
        date,
        notes: notes.trim() || undefined,
        splitType,
        splits: splitInputs,
      })
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to add expense')
    }
  }

  if (!group) return null

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold flex-1">Add expense</Text>
        <TouchableOpacity onPress={onSubmit} disabled={createExpense.isPending}>
          <Text className="text-indigo-600 font-semibold">{createExpense.isPending ? '…' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1">Description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="e.g. Dinner" className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm" />
        </View>

        {/* Amount + Date */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium mb-1">Amount ({group.currency})</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium mb-1">Date</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm" />
          </View>
        </View>

        {/* Paid by */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.userId}
                onPress={() => setPaidById(m.userId)}
                className={`px-3 py-1.5 rounded-lg mr-2 border ${paidById === m.userId ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700'}`}
              >
                <Text className={`text-sm ${paidById === m.userId ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {m.user?.displayName ?? m.user?.username}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-lg mr-2 border ${category === c ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700'}`}
              >
                <Text className={`text-sm capitalize ${category === c ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Split type */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Split</Text>
          <View className="flex-row gap-2">
            {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSplitType(t)}
                className={`flex-1 py-1.5 rounded-lg border items-center ${splitType === t ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-700'}`}
              >
                <Text className={`text-xs font-medium capitalize ${splitType === t ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {splitType !== 'equal' && (
          <View className="mb-4">
            {members.map((m) => (
              <View key={m.userId} className="flex-row items-center mb-2">
                <Text className="flex-1 text-sm">{m.user?.displayName ?? m.user?.username}</Text>
                <TextInput
                  value={splits[m.userId] ?? ''}
                  onChangeText={(v) => setSplits((prev) => ({ ...prev, [m.userId]: v }))}
                  keyboardType="decimal-pad"
                  placeholder={splitType === 'percentage' ? '%' : splitType === 'shares' ? 'shares' : '0.00'}
                  className="w-24 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-right"
                />
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <View className="mb-6">
          <Text className="text-sm font-medium mb-1">Notes <Text className="text-gray-400 font-normal">(optional)</Text></Text>
          <TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={2} className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
