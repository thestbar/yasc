import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: React.ReactNode
}

export function Input({ label, error, hint, leftAddon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className={`flex rounded-lg border ${error ? 'border-red-400 focus-within:ring-red-500' : 'border-gray-300 focus-within:ring-indigo-500'} overflow-hidden focus-within:ring-2 focus-within:border-transparent`}>
        {leftAddon && (
          <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm">
            {leftAddon}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          className={`flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
