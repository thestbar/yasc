import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../lib/api/auth'
import { toast } from 'sonner'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Something went wrong, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-2">Reset password</h2>
          {sent ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.</p>
              <Link to="/auth/login" className="block mt-4 text-brand-600 hover:underline text-center">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button disabled={loading} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <Link to="/auth/login" className="block text-center text-xs text-gray-500 hover:underline">Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
