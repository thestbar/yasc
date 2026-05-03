import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  children: string
}

const bgColor: Record<ButtonVariant, string> = {
  primary: '#4F46E5',
  secondary: '#FFFFFF',
  ghost: 'transparent',
  destructive: '#DC2626',
}
const textColor: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#374151',
  ghost: '#374151',
  destructive: '#FFFFFF',
}
const paddingV: Record<ButtonSize, number> = { sm: 6, md: 10, lg: 13 }
const fontSize: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 16 }

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: bgColor[variant],
          paddingVertical: paddingV[size],
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: '#D1D5DB',
          opacity: disabled || loading ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor[variant]} />
      ) : (
        <Text style={[styles.label, { color: textColor[variant], fontSize: fontSize[size] }]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  label: { fontWeight: '600' },
})
