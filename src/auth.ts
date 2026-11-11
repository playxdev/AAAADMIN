import type { AdminLoginResponse, AdminLoginRequest } from './types'
import { API_ORIGIN } from './api'

const TOKEN_KEY = 'aaa_token'
const USER_KEY = 'aaa_user'

export interface AuthUser {
  token: string
  user_id: string
  full_name: string
  role: string
}

export function getToken(): string | null {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (!stored) return null
  try {
    const user: AuthUser = JSON.parse(stored)
    if (isTokenExpired(user.token)) {
      logout()
      return null
    }
    return user.token
  } catch {
    return null
  }
}

export function getUser(): AuthUser | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    const user: AuthUser = JSON.parse(stored)
    if (isTokenExpired(user.token)) {
      logout()
      return null
    }
    return user
  } catch {
    return null
  }
}

function tokenPayload(token: string): { sub: string; pid: string; exp: number } {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
}

function isTokenExpired(token: string): boolean {
  try {
    return tokenPayload(token).exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function adminLogin(adminName: string, password: string): Promise<AuthUser> {
  const body: AdminLoginRequest = { admin_name: adminName, password }
  const res = await fetch(`${API_ORIGIN}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error === 'INVALID_LOGIN' ? 'Invalid admin name or password' : err.error || 'Login failed')
  }
  const data: AdminLoginResponse = await res.json()
  const claims = tokenPayload(data.access_token)
  const user: AuthUser = {
    token: data.access_token,
    user_id: claims.sub,
    full_name: adminName,
    // sidebar แสดง role ใต้ชื่อ: ใช้ project_id ของ admin (token ไม่มี role)
    role: claims.pid,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(user))
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
