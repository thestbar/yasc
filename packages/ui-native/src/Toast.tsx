import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  variant?: ToastVariant
  onDismiss: () => void
  duration?: number
}

const bg: Record<ToastVariant, string> = {
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  info: '#4F46E5',
}

const icons: Record<ToastVariant, string> = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }

export function Toast({ message, variant = 'info', onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <View style={[styles.toast, { backgroundColor: bg[variant] }]}>
      <Text style={styles.icon}>{icons[variant]}</Text>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.dismiss}>×</Text>
      </TouchableOpacity>
    </View>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; variant?: ToastVariant }>
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <View style={styles.container}>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} variant={t.variant} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 24, left: 16, right: 16, gap: 8, zIndex: 50 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  icon: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  message: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  dismiss: { color: '#FFFFFF', fontSize: 20, lineHeight: 20, opacity: 0.8 },
})
