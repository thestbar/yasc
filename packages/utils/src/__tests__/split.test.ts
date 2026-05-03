import { describe, it, expect } from 'vitest'
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateExactSplit,
  calculateSharesSplit,
  simplifyDebts,
  calculateGroupBalances,
} from '../split'
import type { Expense, Settlement, User } from '@yasc/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

function makeUser(id: string): User {
  return { id, email: `${id}@x.com`, username: id, displayName: id, avatarUrl: null, createdAt: '' }
}

// ─── calculateEqualSplit ──────────────────────────────────────────────────────

describe('calculateEqualSplit', () => {
  it('splits evenly when divisible', () => {
    expect(calculateEqualSplit(300, 3)).toEqual([100, 100, 100])
  })

  it('distributes remainder to first slots', () => {
    const result = calculateEqualSplit(1000, 3)
    expect(result).toEqual([334, 333, 333])
    expect(sum(result)).toBe(1000)
  })

  it('handles single member', () => {
    expect(calculateEqualSplit(500, 1)).toEqual([500])
  })

  it('handles remainder of 1', () => {
    const result = calculateEqualSplit(101, 2)
    expect(sum(result)).toBe(101)
    expect(result[0]).toBe(51)
    expect(result[1]).toBe(50)
  })

  it('returns empty array for 0 members', () => {
    expect(calculateEqualSplit(100, 0)).toEqual([])
  })

  it('handles zero amount', () => {
    expect(calculateEqualSplit(0, 3)).toEqual([0, 0, 0])
  })

  it('always sums to total for various inputs', () => {
    for (const [total, count] of [[999, 7], [10000, 3], [1, 1], [7, 4]] as [number, number][]) {
      expect(sum(calculateEqualSplit(total, count))).toBe(total)
    }
  })
})

// ─── calculatePercentageSplit ─────────────────────────────────────────────────

describe('calculatePercentageSplit', () => {
  it('splits by percentages', () => {
    const result = calculatePercentageSplit(1000, [50, 50])
    expect(result.valid).toBe(true)
    expect(result.amounts).toEqual([500, 500])
  })

  it('returns invalid when percentages do not sum to 100', () => {
    const result = calculatePercentageSplit(1000, [50, 30])
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/100/)
  })

  it('ensures total sums exactly (rounding correction)', () => {
    const result = calculatePercentageSplit(1000, [33, 33, 34])
    expect(result.valid).toBe(true)
    expect(sum(result.amounts!)).toBe(1000)
  })

  it('handles single 100% member', () => {
    const result = calculatePercentageSplit(500, [100])
    expect(result.valid).toBe(true)
    expect(result.amounts).toEqual([500])
  })

  it('accepts floating point percentages summing to 100', () => {
    const result = calculatePercentageSplit(1000, [33.33, 33.33, 33.34])
    expect(result.valid).toBe(true)
    expect(sum(result.amounts!)).toBe(1000)
  })
})

// ─── calculateExactSplit ──────────────────────────────────────────────────────

describe('calculateExactSplit', () => {
  it('validates when amounts sum correctly', () => {
    expect(calculateExactSplit(1000, [600, 400])).toEqual({ valid: true })
  })

  it('rejects when amounts do not sum to total', () => {
    const result = calculateExactSplit(1000, [600, 300])
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/1000/)
  })

  it('works with single amount', () => {
    expect(calculateExactSplit(500, [500])).toEqual({ valid: true })
  })

  it('rejects empty array mismatching total', () => {
    expect(calculateExactSplit(100, [])).toEqual(
      expect.objectContaining({ valid: false }),
    )
  })
})

// ─── calculateSharesSplit ─────────────────────────────────────────────────────

describe('calculateSharesSplit', () => {
  it('splits proportionally by shares', () => {
    const result = calculateSharesSplit(1000, [1, 1, 2])
    expect(sum(result)).toBe(1000)
    expect(result[2]).toBeGreaterThan(result[0])
  })

  it('handles equal shares (same as equal split)', () => {
    const result = calculateSharesSplit(900, [1, 1, 1])
    expect(result).toEqual([300, 300, 300])
  })

  it('returns all zeros for zero shares', () => {
    expect(calculateSharesSplit(1000, [0, 0, 0])).toEqual([0, 0, 0])
  })

  it('handles single share', () => {
    expect(calculateSharesSplit(500, [5])).toEqual([500])
  })

  it('sums to total with rounding', () => {
    const result = calculateSharesSplit(1000, [1, 2, 3])
    expect(sum(result)).toBe(1000)
  })
})

// ─── simplifyDebts ────────────────────────────────────────────────────────────

describe('simplifyDebts', () => {
  it('simplifies a triangle into minimum transactions', () => {
    // A owes B 10, B owes C 10 → A owes C 10
    const debts = [
      { fromUserId: 'A', toUserId: 'B', amount: 10 },
      { fromUserId: 'B', toUserId: 'C', amount: 10 },
    ]
    const result = simplifyDebts(debts)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ fromUserId: 'A', toUserId: 'C', amount: 10 })
  })

  it('returns empty for no debts', () => {
    expect(simplifyDebts([])).toEqual([])
  })

  it('settles direct debt between two people', () => {
    const result = simplifyDebts([{ fromUserId: 'A', toUserId: 'B', amount: 50 }])
    expect(result).toEqual([{ fromUserId: 'A', toUserId: 'B', amount: 50 }])
  })

  it('net-cancels mutual debts', () => {
    const debts = [
      { fromUserId: 'A', toUserId: 'B', amount: 100 },
      { fromUserId: 'B', toUserId: 'A', amount: 100 },
    ]
    expect(simplifyDebts(debts)).toHaveLength(0)
  })

  it('handles partial mutual offset', () => {
    const debts = [
      { fromUserId: 'A', toUserId: 'B', amount: 100 },
      { fromUserId: 'B', toUserId: 'A', amount: 40 },
    ]
    const result = simplifyDebts(debts)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ fromUserId: 'A', toUserId: 'B', amount: 60 })
  })

  it('reduces 3-person cycle to minimum transactions', () => {
    // A→B 30, B→C 20, C→A 10  →  net: A:-20,B:+10,C:+10 → A pays B 10, A pays C 10
    const debts = [
      { fromUserId: 'A', toUserId: 'B', amount: 30 },
      { fromUserId: 'B', toUserId: 'C', amount: 20 },
      { fromUserId: 'C', toUserId: 'A', amount: 10 },
    ]
    const result = simplifyDebts(debts)
    const totalSettled = result.reduce((s, d) => s + d.amount, 0)
    // Net positions: A owes 20 total, B gets 10, C gets 10
    expect(result.length).toBeLessThanOrEqual(2)
    expect(totalSettled).toBe(20)
  })
})

// ─── calculateGroupBalances ───────────────────────────────────────────────────

describe('calculateGroupBalances', () => {
  const alice = makeUser('alice')
  const bob = makeUser('bob')
  const carol = makeUser('carol')

  function makeExpense(paidBy: User, amount: number, splits: Array<[User, number]>): Expense {
    return {
      id: 'e1',
      groupId: 'g1',
      description: 'test',
      amount,
      currency: 'USD',
      date: '',
      category: 'general',
      paidById: paidBy.id,
      paidBy,
      splitType: 'exact',
      splits: splits.map(([user, amt]) => ({
        id: 's1',
        expenseId: 'e1',
        user,
        amount: amt,
        percentage: null,
        shares: null,
        settled: false,
      })),
      receiptUrl: null,
      notes: null,
      createdById: paidBy.id,
      createdAt: '',
      updatedAt: '',
    }
  }

  it('computes net balances from expenses', () => {
    // Alice paid 300, split equally [100, 100, 100]
    const expense = makeExpense(alice, 300, [[alice, 100], [bob, 100], [carol, 100]])
    const balances = calculateGroupBalances([expense], [])

    const aliceBal = balances.find((b) => b.userId === 'alice')!
    const bobBal = balances.find((b) => b.userId === 'bob')!
    const carolBal = balances.find((b) => b.userId === 'carol')!

    expect(aliceBal.amount).toBe(200)   // paid 300, owes 100 → net +200
    expect(bobBal.amount).toBe(-100)
    expect(carolBal.amount).toBe(-100)
  })

  it('settlements offset balances', () => {
    const expense = makeExpense(alice, 300, [[alice, 100], [bob, 100], [carol, 100]])
    const settlement: Settlement = {
      id: 's1',
      groupId: 'g1',
      fromUser: bob,
      toUser: alice,
      amount: 100,
      currency: 'USD',
      date: '',
      notes: null,
      createdAt: '',
    }
    const balances = calculateGroupBalances([expense], [settlement])
    const bobBal = balances.find((b) => b.userId === 'bob')!
    expect(bobBal.amount).toBe(0)
  })

  it('returns empty for no expenses and no settlements', () => {
    expect(calculateGroupBalances([], [])).toEqual([])
  })
})
