import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { friendsApi } from '../api/friends'
import { usersApi } from '../api/users'

export function useFriends() {
  return useQuery({ queryKey: ['friends'], queryFn: friendsApi.list })
}

export function useFriendRequests() {
  return useQuery({ queryKey: ['friend-requests'], queryFn: friendsApi.requests })
}

export function useSentFriendRequests() {
  return useQuery({ queryKey: ['friend-sent'], queryFn: friendsApi.sent })
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => usersApi.search(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (identifier: string) => friendsApi.sendRequest(identifier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-sent'] })
    },
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
    },
  })
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.decline(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friend-requests'] }),
  })
}

export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useCancelFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friend-sent'] })
      qc.invalidateQueries({ queryKey: ['users', 'search'] })
    },
  })
}
