import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type CreateExpenseData } from '../api/expenses'

export function useGroupExpenses(groupId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['expenses', groupId, params],
    queryFn: () => expensesApi.list(groupId, params).then((r) => r.data),
    enabled: !!groupId,
  })
}

export function useExpense(groupId: string, id: string) {
  return useQuery({
    queryKey: ['expenses', groupId, id],
    queryFn: () => expensesApi.get(groupId, id),
    enabled: !!groupId && !!id,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, ...data }: CreateExpenseData & { groupId: string }) =>
      expensesApi.create(groupId, data),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, expenseId, data }: { groupId: string; expenseId: string; data: CreateExpenseData }) =>
      expensesApi.update(groupId, expenseId, data),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}

export function useConvertExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, expenseId, targetCurrency }: { groupId: string; expenseId: string; targetCurrency: string }) =>
      expensesApi.convert(groupId, expenseId, targetCurrency),
    onSuccess: (_, { groupId, expenseId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId, expenseId] })
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, expenseId }: { groupId: string; expenseId: string }) =>
      expensesApi.delete(groupId, expenseId),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['expenses', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}
