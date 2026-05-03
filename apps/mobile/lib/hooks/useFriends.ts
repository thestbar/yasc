import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { friendsApi } from '../api/friends'

export function useFriends() {
  return useQuery({ queryKey: ['friends'], queryFn: friendsApi.list })
}

export function useFriendRequests() {
  return useQuery({ queryKey: ['friend-requests'], queryFn: friendsApi.requests })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (identifier: string) => friendsApi.sendRequest(identifier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
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
