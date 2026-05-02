import { describe, it, expect } from 'vitest'
import { isValidUsername, isValidEmail } from '../validation'

describe('isValidUsername', () => {
  it('accepts valid usernames', () => {
    expect(isValidUsername('alice')).toBe(true)
    expect(isValidUsername('bob_123')).toBe(true)
    expect(isValidUsername('ABC')).toBe(true)
    expect(isValidUsername('a'.repeat(20))).toBe(true)
  })

  it('rejects too short', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('')).toBe(false)
  })

  it('rejects too long', () => {
    expect(isValidUsername('a'.repeat(21))).toBe(false)
  })

  it('rejects spaces and special chars', () => {
    expect(isValidUsername('alice bob')).toBe(false)
    expect(isValidUsername('alice-bob')).toBe(false)
    expect(isValidUsername('alice@bob')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user+tag@sub.domain.org')).toBe(true)
  })

  it('rejects missing @', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects missing TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })
})
