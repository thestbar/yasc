import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useCreateGroup } from '../../../lib/hooks/useGroups'
import { CURRENCIES } from '@yasc/utils'

export default function NewGroupScreen() {
  const create = useCreateGroup()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [simplifyDebts, setSimplifyDebts] = useState(true)
  const [error, setError] = useState('')

  const onSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setError('')
    try {
      const group = await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined, currency, simplifyDebts })
      router.replace(`/(tabs)/groups/${group.id}`)
    } catch {
      setError('Failed to create group')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-xl font-bold flex-1">New group</Text>
        <TouchableOpacity onPress={onSubmit} disabled={create.isPending}>
          <Text className="text-indigo-600 font-semibold">{create.isPending ? '…' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-4">
          <Text className="text-sm font-medium mb-1">Group name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Tokyo Trip"
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm"
          />
          {error ? <Text className="text-xs text-red-500 mt-1">{error}</Text> : null}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-1">Description <Text className="text-gray-400 font-normal">(optional)</Text></Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            multiline
            numberOfLines={2}
            className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Currency</Text>
          <View className="border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
              {CURRENCIES.slice(0, 10).map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  className={`px-3 py-1.5 rounded-lg mr-2 ${currency === c.code ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Text className={`text-sm font-medium ${currency === c.code ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View className="flex-row items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
          <View className="flex-1">
            <Text className="text-sm font-medium">Simplify debts</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Reduce the number of transactions needed to settle up</Text>
          </View>
          <Switch value={simplifyDebts} onValueChange={setSimplifyDebts} trackColor={{ true: '#4f46e5' }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
