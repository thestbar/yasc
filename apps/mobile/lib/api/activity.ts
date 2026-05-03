import { http } from '../http'
import type { ActivityItem, PaginatedResponse } from '@yasc/types'

export const activityApi = {
  feed: (params?: { page?: number; limit?: number; groupId?: string }) =>
    http.get<PaginatedResponse<ActivityItem>>('/activity', { params }).then((r) => r.data),
}
