import { describe, it, expect } from 'vitest'
import { formatExpenseDate, formatRelativeTime } from '../date'

describe('formatExpenseDate', () => {
  it('formats an ISO date string', () => {
    const result = formatExpenseDate('2024-04-28T00:00:00Z')
    expect(result).toMatch(/Apr\s+28/)
  })

  it('returns a short month + day format', () => {
    const result = formatExpenseDate('2024-01-01T00:00:00Z')
    expect(result).toMatch(/Jan\s+1/)
  })
})

describe('formatRelativeTime', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

  it('shows "just now" for very recent', () => {
    expect(formatRelativeTime(ago(5000))).toBe('just now')
  })

  it('shows minutes', () => {
    expect(formatRelativeTime(ago(2 * 60 * 1000))).toBe('2 minutes ago')
  })

  it('shows singular minute', () => {
    expect(formatRelativeTime(ago(61 * 1000))).toBe('1 minute ago')
  })

  it('shows hours', () => {
    expect(formatRelativeTime(ago(3 * 60 * 60 * 1000))).toBe('3 hours ago')
  })

  it('shows singular hour', () => {
    expect(formatRelativeTime(ago(61 * 60 * 1000))).toBe('1 hour ago')
  })

  it('shows days', () => {
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60 * 1000))).toBe('3 days ago')
  })

  it('shows weeks', () => {
    expect(formatRelativeTime(ago(14 * 24 * 60 * 60 * 1000))).toBe('2 weeks ago')
  })

  it('shows months', () => {
    expect(formatRelativeTime(ago(60 * 24 * 60 * 60 * 1000))).toBe('2 months ago')
  })

  it('shows years', () => {
    expect(formatRelativeTime(ago(400 * 24 * 60 * 60 * 1000))).toBe('1 year ago')
  })
})
