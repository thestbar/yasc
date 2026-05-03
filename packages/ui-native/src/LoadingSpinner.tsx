import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  fullScreen?: boolean
}

const rnSize: Record<'sm' | 'md' | 'lg', 'small' | 'large'> = { sm: 'small', md: 'small', lg: 'large' }

export function LoadingSpinner({ size = 'md', color = '#4F46E5', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={rnSize[size]} color={color} />
      </View>
    )
  }
  return <ActivityIndicator size={rnSize[size]} color={color} />
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
