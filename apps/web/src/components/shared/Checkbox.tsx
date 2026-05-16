import { forwardRef } from 'react'
import { Check } from 'lucide-react'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(({ label, description, ...props }, ref) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <div className="relative mt-0.5 shrink-0 w-4 h-4">
      <input {...props} ref={ref} type="checkbox" className="sr-only peer" />
      <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-colors" />
      <Check
        size={10}
        strokeWidth={3}
        className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
      />
    </div>
    <div>
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
  </label>
))

Checkbox.displayName = 'Checkbox'
