import { getToken, logout } from './auth'

// dev: ว่าง (vite proxy /api ไป wrangler dev), production: origin ของ AAA API ตั้งใน .env.production
export const API_ORIGIN = import.meta.env.VITE_API_BASE ?? ''
const BASE = `${API_ORIGIN}/api/v1/admin`

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    logout()
    window.location.reload()
    throw new ApiError('Unauthorized', 401)
  }

  if (!res.ok) {
    // API ตอบ { error, field? } เช่น { error: "BAD_REQUEST", field: "house_code" }
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(err.field ? `${err.error}: ${err.field}` : err.error || 'Request failed', res.status)
  }

  return res.json()
}

export const api = {
  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path
    return request<T>(url)
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  del<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}
