import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useRegister } from '../../lib/hooks/useAuth'
import { isValidUsername, isValidEmail } from '@yasc/utils'

const schema = z.object({
  email: z.string().refine(isValidEmail, 'Invalid email'),
  username: z.string().refine(isValidUsername, 'Username must be 3–20 alphanumeric characters or underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type Fields = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const register_ = useRegister()
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ confirmPassword: _, ...data }) => {
    try {
      await register_.mutateAsync(data)
      navigate('/groups')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed')
    }
  })

  const field = (name: keyof Fields, label: string, type = 'text', hint?: string) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input {...register(name)} type={type} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]?.message as string}</p>}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">YASC</h1>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-5">Create account</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            {field('email', 'Email', 'email')}
            {field('username', 'Username', 'text', '3–20 chars, letters, numbers, underscores')}
            {field('displayName', 'Display name')}
            {field('password', 'Password', 'password')}
            {field('confirmPassword', 'Confirm password', 'password')}
            <button type="submit" disabled={register_.isPending} className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
              {register_.isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-4">
            Already have an account? <Link to="/auth/login" className="text-brand-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
