import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi, type CreateGroupData } from '../api/groups'

export function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: groupsApi.list })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.get(id),
    enabled: !!id,
  })
}

export function useGroupBalances(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'balances'],
    queryFn: () => groupsApi.balances(id),
    enabled: !!id,
  })
}

export function useGroupMembers(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'members'],
    queryFn: () => groupsApi.members(id),
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupData) => groupsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGroupData> }) =>
      groupsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['groups', id] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: (_, { groupId }) =>
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'members'] }),
  })
}

export function useLeaveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.leave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useRegenerateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.regenerateInvite(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['groups', id] }),
  })
}
