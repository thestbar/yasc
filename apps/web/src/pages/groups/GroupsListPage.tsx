import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useGroups } from '../../lib/hooks/useGroups'
import { formatCurrency } from '@yasc/utils'

export function GroupsListPage() {
  const { data: groups = [], isLoading } = useGroups()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Groups</h1>
        <Link
          to="/groups/new"
          className="flex items-center gap-1.5 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700"
        >
          <Plus size={16} />
          New group
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No groups yet.</p>
          <p className="text-xs mt-1">Create one to start splitting expenses.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{group.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{group.currency}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
