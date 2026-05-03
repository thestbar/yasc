import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  icon: { marginBottom: 16, opacity: 0.35 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  description: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 260 },
  action: { marginTop: 16 },
})
