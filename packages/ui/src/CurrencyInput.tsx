import React from 'react'
import { CURRENCIES } from '@yasc/utils'

interface CurrencyInputProps {
  value: string
  currency: string
  onValueChange: (value: string) => void
  onCurrencyChange: (currency: string) => void
  label?: string
  error?: string
  disabled?: boolean
}

export function CurrencyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  label,
  error,
  disabled,
}: CurrencyInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className={`flex rounded-lg border ${error ? 'border-red-400' : 'border-gray-300'} overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500`}>
        <input
          type="number"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          min="0"
          step="0.01"
          placeholder="0.00"
          className="flex-1 px-3 py-2 text-sm outline-none disabled:bg-gray-50"
        />
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={disabled}
          className="border-l border-gray-300 px-2 py-2 text-sm bg-gray-50 outline-none disabled:opacity-50"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
