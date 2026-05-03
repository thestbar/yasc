import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-brand-600 mb-4">404</p>
        <p className="text-gray-500 text-sm mb-6">Page not found.</p>
        <Link to="/groups" className="text-brand-600 text-sm hover:underline">Go to groups</Link>
      </div>
    </div>
  )
}
