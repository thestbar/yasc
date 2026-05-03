import React from 'react'
import { View, TextInput, Text, StyleSheet } from 'react-native'
import { CURRENCIES } from '@yasc/utils'

interface CurrencyInputProps {
  value: string
  currency: string
  onValueChange: (value: string) => void
  label?: string
  error?: string
  editable?: boolean
}

export function CurrencyInput({ value, currency, onValueChange, label, error, editable = true }: CurrencyInputProps) {
  const info = CURRENCIES.find((c) => c.code === currency)

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, error ? styles.rowError : styles.rowNormal]}>
        <Text style={styles.symbol}>{info?.symbol ?? currency}</Text>
        <TextInput
          value={value}
          onChangeText={onValueChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          editable={editable}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.code}>{currency}</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  rowNormal: { borderColor: '#D1D5DB' },
  rowError: { borderColor: '#F87171' },
  symbol: { paddingHorizontal: 12, fontSize: 15, color: '#374151' },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#111827' },
  code: { paddingHorizontal: 12, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  error: { marginTop: 4, fontSize: 11, color: '#DC2626' },
})
