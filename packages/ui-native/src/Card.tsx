import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface CardProps {
  children: React.ReactNode
  header?: string
  footer?: React.ReactNode
  padding?: boolean
}

export function Card({ children, header, footer, padding = true }: CardProps) {
  return (
    <View style={styles.card}>
      {header && (
        <View style={styles.header}>
          <Text style={styles.headerText}>{header}</Text>
        </View>
      )}
      <View style={padding ? styles.body : undefined}>{children}</View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  headerText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  body: { padding: 16 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
})
