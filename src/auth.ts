import type { LoginResponse, LoginRequest, AdminLoginResponse, AdminLoginRequest } from './types'

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

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function login(userId: string, phoneNumber: string): Promise<AuthUser> {
  const body: LoginRequest = { user_id: userId, phone_number: phoneNumber }
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Login failed')
  }
  const data: LoginResponse = await res.json()
  const user: AuthUser = {
    token: data.token,
    user_id: data.user_id,
    full_name: data.full_name,
    role: data.role,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(user))
  localStorage.setItem(USER_KEY, JSON.stringify(user))
	return user
}

export async function adminLogin(adminName: string, password: string): Promise<AuthUser> {
	const body: AdminLoginRequest = { admin_name: adminName, password }
	const res = await fetch('/api/v1/auth/admin/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) {
		const err = await res.json()
		throw new Error(err.error || 'Login failed')
	}
	const data: AdminLoginResponse = await res.json()
	const user: AuthUser = {
		token: data.token,
		user_id: data.admin_id,
		full_name: data.full_name,
		role: data.role,
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
