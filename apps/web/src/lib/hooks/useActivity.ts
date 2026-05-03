import { useQuery } from '@tanstack/react-query'
import { activityApi } from '../api/activity'

export function useActivity(params?: { page?: number; limit?: number; groupId?: string }) {
  return useQuery({
    queryKey: ['activity', params],
    queryFn: () => activityApi.feed(params),
  })
}
