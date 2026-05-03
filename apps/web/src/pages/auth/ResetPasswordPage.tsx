import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '../../lib/api/auth'
import { toast } from 'sonner'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const token = params.get('token') ?? ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      toast.success('Password reset! Please sign in.')
      navigate('/auth/login')
    } catch {
      toast.error('Token invalid or expired')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Set new password</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm new password</label>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button disabled={loading || !token} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
