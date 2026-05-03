import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, style, ...props }: InputProps) {
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          error ? styles.inputError : styles.inputNormal,
          style,
        ]}
        placeholderTextColor="#9CA3AF"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#FFFFFF' },
  inputNormal: { borderColor: '#D1D5DB' },
  inputError: { borderColor: '#F87171' },
  error: { marginTop: 4, fontSize: 11, color: '#DC2626' },
  hint: { marginTop: 4, fontSize: 11, color: '#6B7280' },
})
