import { http } from '../http'
import type { ExchangeRates } from '@yasc/utils'

export const currencyApi = {
  rates: (base = 'USD') =>
    http.get<ExchangeRates>('/currency/rates', { params: { base } }).then((r) => r.data),
}
