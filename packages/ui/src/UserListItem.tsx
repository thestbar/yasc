import React from 'react'
import { Avatar } from './Avatar'

interface UserListItemProps {
  name: string
  subtitle?: string
  avatarUrl?: string | null
  right?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function UserListItem({ name, subtitle, avatarUrl, right, onClick, className = '' }: UserListItemProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors ${onClick ? 'hover:bg-gray-50 cursor-pointer' : ''} ${className}`}
    >
      <Avatar src={avatarUrl} name={name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </Tag>
  )
}
