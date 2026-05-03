import React from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-14 h-14 text-lg' }

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const base = `${sizes[size]} rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`

  if (src) {
    return <img src={src} alt={name} className={`${base} object-cover`} />
  }

  return (
    <div className={`${base} bg-indigo-100 text-indigo-700 font-semibold select-none`}>
      {initials}
    </div>
  )
}
