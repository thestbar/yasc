export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}
