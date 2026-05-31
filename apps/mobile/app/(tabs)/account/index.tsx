import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner-native'
import { useMe, useLogout } from '../../../lib/hooks/useAuth'
import { useAuthStore } from '../../../lib/store/auth'
import { usersApi } from '../../../lib/api/users'
import { isValidUsername } from '@yasc/utils'

export default function AccountScreen() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const logout = useLogout()
  const clear = useAuthStore((s) => s.clear)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (me) { setDisplayName(me.displayName); setUsername(me.username) }
  }, [me])

  const updateProfile = useMutation({
    mutationFn: () => usersApi.update({ displayName, username }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile updated') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update profile'),
  })

  const updatePassword = useMutation({
    mutationFn: () => usersApi.updatePassword({ currentPassword, newPassword }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); toast.success('Password changed') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to change password'),
  })

  const deleteAccount = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => { clear(); },
  })

  const onSaveProfile = () => {
    if (!displayName.trim()) { toast.error('Display name is required'); return }
    if (!isValidUsername(username)) { toast.error('Invalid username'); return }
    updateProfile.mutate()
  }

  const onChangePassword = () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    updatePassword.mutate()
  }

  const onLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout.mutate() },
    ])
  }

  const onDeleteAccount = () => {
    Alert.alert('Delete account', 'This permanently deletes all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccount.mutate() },
    ])
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <Text className="text-sm font-semibold mb-4">{title}</Text>
      {children}
    </View>
  )

  const Field = ({ label, value, onChange, secureTextEntry = false, editable = true, keyboardType = 'default' as any }: {
    label: string; value: string; onChange?: (v: string) => void; secureTextEntry?: boolean; editable?: boolean; keyboardType?: any
  }) => (
    <View className="mb-3">
      <Text className="text-sm font-medium mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        className={`border rounded-xl px-3 py-2.5 text-sm ${editable ? 'border-gray-300 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
      />
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="px-4 py-3">
        <Text className="text-xl font-bold">Account</Text>
      </View>

      <ScrollView className="flex-1">
        <Section title="Profile">
          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Email" value={me?.email ?? ''} editable={false} keyboardType="email-address" />
          <TouchableOpacity onPress={onSaveProfile} disabled={updateProfile.isPending} className="bg-indigo-600 rounded-xl py-2.5 items-center mt-1 disabled:opacity-50">
            <Text className="text-white font-semibold text-sm">{updateProfile.isPending ? 'Saving…' : 'Save profile'}</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Change password">
          <Field label="Current password" value={currentPassword} onChange={setCurrentPassword} secureTextEntry />
          <Field label="New password" value={newPassword} onChange={setNewPassword} secureTextEntry />
          <Field label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} secureTextEntry />
          <TouchableOpacity onPress={onChangePassword} disabled={updatePassword.isPending} className="bg-indigo-600 rounded-xl py-2.5 items-center mt-1 disabled:opacity-50">
            <Text className="text-white font-semibold text-sm">{updatePassword.isPending ? 'Changing…' : 'Change password'}</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Session">
          <TouchableOpacity onPress={onLogout} disabled={logout.isPending} className="py-1">
            <Text className="text-sm text-red-500">{logout.isPending ? 'Signing out…' : 'Sign out'}</Text>
          </TouchableOpacity>
        </Section>

        <View className="mx-4 mt-3 mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-4">
          <Text className="text-sm font-semibold text-red-600 mb-2">Danger zone</Text>
          <Text className="text-xs text-gray-500 mb-3">Permanently delete your account and all data.</Text>
          <TouchableOpacity onPress={onDeleteAccount} disabled={deleteAccount.isPending}>
            <Text className="text-sm text-red-600">{deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
