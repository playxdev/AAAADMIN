import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { type TKey, t } from './i18n'

// dev: empty (Vite proxies /api to wrangler dev); production: AAA API origin from .env.production
const API_ORIGIN: string = import.meta.env.VITE_API_BASE ?? ''

export const api = axios.create({ baseURL: `${API_ORIGIN}/api/v1/admin` })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** API error body is `{ error, field? }`, e.g. `{ error: "BAD_REQUEST", field: "house_code" }`. */
export function apiErrorMessage(error: unknown, fallback = t('err.request')) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: string; field?: string }
      | undefined
    if (body?.error) {
      // Known codes have an api.* key; unknown codes show as-is.
      const msg = t(`api.${body.error}` as TKey).replace(/^api\./, '')
      return body.field ? `${msg}: ${body.field}` : msg
    }
  }
  return error instanceof Error ? error.message : fallback
}
