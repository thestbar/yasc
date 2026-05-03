import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const dim = { sm: 24, md: 36, lg: 56 }
const font = { sm: 10, md: 13, lg: 20 }

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const d = dim[size]

  if (src) {
    return <Image source={{ uri: src }} style={[styles.base, { width: d, height: d, borderRadius: d / 2 }]} />
  }

  return (
    <View style={[styles.fallback, { width: d, height: d, borderRadius: d / 2 }]}>
      <Text style={[styles.initials, { fontSize: font[size] }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { resizeMode: 'cover' },
  fallback: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#4338CA', fontWeight: '600' },
})
