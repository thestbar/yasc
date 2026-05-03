import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Avatar } from './Avatar'

interface UserListItemProps {
  name: string
  subtitle?: string
  avatarUrl?: string | null
  right?: React.ReactNode
  onPress?: () => void
}

export function UserListItem({ name, subtitle, avatarUrl, right, onPress }: UserListItemProps) {
  const Inner = (
    <View style={styles.row}>
      <Avatar src={avatarUrl} name={name} size="md" />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
        {Inner}
      </TouchableOpacity>
    )
  }

  return <View style={styles.container}>{Inner}</View>
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1 },
  name: { fontSize: 14, fontWeight: '500', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  right: { flexShrink: 0 },
})
