import React, { useEffect } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariant
  onDismiss: () => void
  duration?: number
}

const styles: Record<ToastVariant, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-indigo-600',
}

const icons: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export function Toast({ message, variant = 'info', onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-lg ${styles[variant]}`}
    >
      <span className="font-bold">{icons[variant]}</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-75 hover:opacity-100 text-lg leading-none">
        ×
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; variant?: ToastVariant }>
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} variant={t.variant} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}
