import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'

// Same-origin API: Pages/Workers route /api/* to the backend, Vite proxies it in dev.
export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Backend error body is `{ error: string }`. */
export function apiErrorMessage(error: unknown, fallback = 'Request failed') {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.error
    if (typeof msg === 'string' && msg) return msg
  }
  return error instanceof Error ? error.message : fallback
}
