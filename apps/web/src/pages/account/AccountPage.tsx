import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useMe, useLogout } from '../../lib/hooks/useAuth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../lib/api/users'
import { useAuthStore } from '../../lib/store/auth'
import { isValidUsername } from '@yasc/utils'

const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  username: z.string().refine(isValidUsername, 'Username must be 3–20 alphanumeric chars or underscores'),
})
type ProfileFields = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type PasswordFields = z.infer<typeof passwordSchema>

export function AccountPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const logout = useLogout()
  const clear = useAuthStore((s) => s.clear)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const profileForm = useForm<ProfileFields>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PasswordFields>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (me) profileForm.reset({ displayName: me.displayName, username: me.username })
  }, [me])

  const updateProfile = useMutation({
    mutationFn: (data: ProfileFields) => usersApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); toast.success('Profile updated') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update profile'),
  })

  const updatePassword = useMutation({
    mutationFn: (data: PasswordFields) => usersApi.updatePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => { passwordForm.reset(); toast.success('Password changed') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to change password'),
  })

  const deleteAccount = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => { clear(); window.location.href = '/auth/login' },
    onError: () => toast.error('Failed to delete account'),
  })

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const onLogout = async () => {
    try {
      await logout.mutateAsync()
    } catch {
      // ignore
    }
    clear()
    window.location.href = '/auth/login'
  }

  const section = (title: string, children: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Account</h1>

      {section('Profile', (
        <form onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input {...profileForm.register('displayName')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {profileForm.formState.errors.displayName && <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.displayName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input {...profileForm.register('username')} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {profileForm.formState.errors.username && <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={me?.email ?? ''} readOnly className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed" />
          </div>
          <button type="submit" disabled={!profileForm.formState.isDirty || updateProfile.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            {updateProfile.isPending ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      ))}

      {section('Change password', (
        <form onSubmit={passwordForm.handleSubmit((d) => updatePassword.mutate(d))} className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((name) => (
            <div key={name}>
              <label className="block text-sm font-medium mb-1">
                {name === 'currentPassword' ? 'Current password' : name === 'newPassword' ? 'New password' : 'Confirm new password'}
              </label>
              <input {...passwordForm.register(name)} type="password" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {passwordForm.formState.errors[name] && <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors[name]?.message}</p>}
            </div>
          ))}
          <button type="submit" disabled={updatePassword.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            {updatePassword.isPending ? 'Changing…' : 'Change password'}
          </button>
        </form>
      ))}

      {section('Appearance', (
        <button onClick={toggleDark} className="flex items-center gap-3 text-sm">
          {dark ? <Moon size={18} className="text-brand-400" /> : <Sun size={18} className="text-yellow-500" />}
          <span>{dark ? 'Dark mode' : 'Light mode'}</span>
        </button>
      ))}

      {section('Session', (
        <button onClick={onLogout} disabled={logout.isPending} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-50">
          <LogOut size={18} />
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      ))}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-3">Danger zone</h2>
        <p className="text-xs text-gray-500 mb-3">Permanently delete your account and all data. This cannot be undone.</p>
        <button
          onClick={() => { if (confirm('Delete your account? This cannot be undone.')) deleteAccount.mutate() }}
          disabled={deleteAccount.isPending}
          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleteAccount.isPending ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </div>
  )
}
