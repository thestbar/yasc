import type { Expense, Settlement } from '@yasc/types'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface Balance {
  userId: string
  amount: number
}

export interface DebtEdge {
  fromUserId: string
  toUserId: string
  amount: number
}

export interface SimplifiedDebt {
  fromUserId: string
  toUserId: string
  amount: number
}

/**
 * Distributes remainder cents to the first splits so the total always sums exactly.
 */
export function calculateEqualSplit(totalAmount: number, memberCount: number): number[] {
  if (memberCount <= 0) return []
  const base = Math.floor(totalAmount / memberCount)
  const remainder = totalAmount % memberCount
  return Array.from({ length: memberCount }, (_, i) => (i < remainder ? base + 1 : base))
}

export function calculatePercentageSplit(totalAmount: number, percentages: number[]): ValidationResult & { amounts?: number[] } {
  const sum = percentages.reduce((a, b) => a + b, 0)
  if (Math.abs(sum - 100) > 0.01) {
    return { valid: false, error: `Percentages must sum to 100, got ${sum}` }
  }
  const amounts = percentages.map((p) => Math.round((p / 100) * totalAmount))
  // Fix rounding drift on last element
  const diff = totalAmount - amounts.reduce((a, b) => a + b, 0)
  amounts[amounts.length - 1] += diff
  return { valid: true, amounts }
}

export function calculateExactSplit(totalAmount: number, amounts: number[]): ValidationResult {
  const sum = amounts.reduce((a, b) => a + b, 0)
  if (sum !== totalAmount) {
    return { valid: false, error: `Amounts must sum to ${totalAmount}, got ${sum}` }
  }
  return { valid: true }
}

export function calculateSharesSplit(totalAmount: number, shares: number[]): number[] {
  const totalShares = shares.reduce((a, b) => a + b, 0)
  if (totalShares <= 0) return shares.map(() => 0)
  const amounts = shares.map((s) => Math.round((s / totalShares) * totalAmount))
  const diff = totalAmount - amounts.reduce((a, b) => a + b, 0)
  amounts[amounts.length - 1] += diff
  return amounts
}

export function calculateGroupBalances(expenses: Expense[], settlements: Settlement[]): Balance[] {
  const balances = new Map<string, number>()

  const ensure = (id: string) => {
    if (!balances.has(id)) balances.set(id, 0)
  }

  for (const expense of expenses) {
    ensure(expense.paidById)
    balances.set(expense.paidById, (balances.get(expense.paidById) ?? 0) + expense.amount)
    for (const split of expense.splits) {
      ensure(split.user.id)
      balances.set(split.user.id, (balances.get(split.user.id) ?? 0) - split.amount)
    }
  }

  for (const s of settlements) {
    ensure(s.fromUser.id)
    ensure(s.toUser.id)
    // fromUser paid toUser, so fromUser's debt decreases (balance goes up) and toUser's credit decreases
    balances.set(s.fromUser.id, (balances.get(s.fromUser.id) ?? 0) + s.amount)
    balances.set(s.toUser.id, (balances.get(s.toUser.id) ?? 0) - s.amount)
  }

  return Array.from(balances.entries()).map(([userId, amount]) => ({ userId, amount }))
}

export function simplifyDebts(debts: DebtEdge[]): SimplifiedDebt[] {
  const netBalance = new Map<string, number>()

  for (const { fromUserId, toUserId, amount } of debts) {
    netBalance.set(fromUserId, (netBalance.get(fromUserId) ?? 0) - amount)
    netBalance.set(toUserId, (netBalance.get(toUserId) ?? 0) + amount)
  }

  const creditors: Array<{ id: string; amount: number }> = []
  const debtors: Array<{ id: string; amount: number }> = []

  for (const [id, amount] of netBalance.entries()) {
    if (amount > 0) creditors.push({ id, amount })
    else if (amount < 0) debtors.push({ id, amount: -amount })
  }

  const result: SimplifiedDebt[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debt = debtors[di]
    const settle = Math.min(credit.amount, debt.amount)

    result.push({ fromUserId: debt.id, toUserId: credit.id, amount: settle })

    credit.amount -= settle
    debt.amount -= settle

    if (credit.amount === 0) ci++
    if (debt.amount === 0) di++
  }

  return result
}
