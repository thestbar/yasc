import { useQuery } from '@tanstack/react-query'
import { currencyApi } from '../api/currency'

export function useExchangeRates(base = 'USD') {
  return useQuery({
    queryKey: ['currency', base],
    queryFn: () => currencyApi.rates(base),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
