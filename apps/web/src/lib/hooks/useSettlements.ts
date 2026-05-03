import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settlementsApi } from '../api/settlements'
import type { CreateSettlementData } from '../api/settlements'

export function useSettlements(groupId: string) {
  return useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => settlementsApi.list(groupId),
    enabled: !!groupId,
  })
}

export function useCreateSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, ...data }: CreateSettlementData & { groupId: string }) =>
      settlementsApi.create(groupId, data),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['settlements', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}

export function useDeleteSettlement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, settlementId }: { groupId: string; settlementId: string }) =>
      settlementsApi.delete(groupId, settlementId),
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['settlements', groupId] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] })
    },
  })
}
