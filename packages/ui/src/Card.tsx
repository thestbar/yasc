import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  padding?: boolean
}

export function Card({ children, className = '', header, footer, padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {header && (
        <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-800">{header}</div>
      )}
      <div className={padding ? 'p-4' : ''}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">{footer}</div>
      )}
    </div>
  )
}
