import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: string
}

const bg: Record<BadgeVariant, string> = {
  default: '#F3F4F6',
  success: '#DCFCE7',
  warning: '#FEF9C3',
  danger: '#FEE2E2',
  info: '#DBEAFE',
}

const fg: Record<BadgeVariant, string> = {
  default: '#374151',
  success: '#15803D',
  warning: '#854D0E',
  danger: '#B91C1C',
  info: '#1D4ED8',
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <View style={[styles.base, { backgroundColor: bg[variant] }]}>
      <Text style={[styles.label, { color: fg[variant] }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  label: { fontSize: 11, fontWeight: '500' },
})
