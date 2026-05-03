import { describe, it, expect } from 'vitest'
import { CURRENCIES, formatCurrency, convertAmount } from '../currency'

describe('CURRENCIES', () => {
  it('starts with the 8 priority currencies', () => {
    const codes = CURRENCIES.slice(0, 8).map((c) => c.code)
    expect(codes).toEqual(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'])
  })

  it('has unique codes', () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every entry has code, name, and symbol', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.symbol).toBeTruthy()
    }
  })
})

describe('formatCurrency', () => {
  it('formats USD cents', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$10.00')
  })

  it('formats zero-decimal JPY', () => {
    const result = formatCurrency(1000, 'JPY')
    expect(result).toContain('1,000')
    expect(result).not.toContain('.')
  })

  it('formats EUR cents', () => {
    const result = formatCurrency(999, 'EUR')
    expect(result).toContain('9.99')
  })

  it('handles zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })
})

describe('convertAmount', () => {
  const rates = { USD: 1, EUR: 0.92, GBP: 0.79 }

  it('returns same amount for same currency', () => {
    expect(convertAmount(1000, 'USD', 'USD', rates)).toBe(1000)
  })

  it('converts USD to EUR', () => {
    // 1000 cents USD → ~920 cents EUR
    expect(convertAmount(1000, 'USD', 'EUR', rates)).toBe(920)
  })

  it('converts EUR to GBP', () => {
    const result = convertAmount(920, 'EUR', 'GBP', rates)
    expect(result).toBeTypeOf('number')
  })

  it('throws for missing rate', () => {
    expect(() => convertAmount(100, 'USD', 'XYZ', rates)).toThrow()
    expect(() => convertAmount(100, 'XYZ', 'USD', rates)).toThrow()
  })
})
