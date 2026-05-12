import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useLogin } from '../../lib/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type Fields = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/groups'
  const login = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data)
      navigate(redirect, { replace: true })
    } catch {
      toast.error('Invalid email or password')
    }
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">YASC</h1>
          <p className="text-gray-500 mt-1 text-sm">Split expenses, not friendships</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-5">Sign in</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input {...register('email')} type="email" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input {...register('password')} type="password" className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={login.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-4">
            No account? <Link to={`/auth/register${redirect !== '/groups' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-brand-600 hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
