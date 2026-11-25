import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const AUTH_COOKIE = 'aaa_session'
// Root only: project being managed (sent as X-Project-Code); empty = root's own project.
const AS_PROJECT_COOKIE = 'as_project'

export interface AuthUser {
  id: string
  fullName: string
  projectId: string
  /** e.g. PROJ-0001 (missing in sessions saved before v2.3.0). */
  projectCode?: string
  /** Village / condo / building name, e.g. หมู่บ้านทดสอบ. */
  projectName?: string
  /** ROOT (PlayDevX, every project) or ADMIN (one project). */
  level?: 'ROOT' | 'ADMIN'
}

interface Session {
  token: string
  user: AuthUser
}

/** Decoded JWT payload (no signature check; the API verifies the token). */
export function tokenClaims(token: string): {
  sub: string
  pid: string
  exp: number
} {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(payload))
}

/** JWT `exp` in ms, or 0 when the token cannot be decoded. */
export function tokenExpiry(token: string): number {
  try {
    const exp = Number(tokenClaims(token).exp)
    return Number.isFinite(exp) ? exp * 1000 : 0
  } catch {
    return 0
  }
}

function loadSession(): Session | null {
  const raw = getCookie(AUTH_COOKIE)
  if (!raw) return null
  try {
    const session = JSON.parse(decodeURIComponent(raw)) as Session
    return tokenExpiry(session.token) > Date.now() ? session : null
  } catch {
    return null
  }
}

interface AuthState {
  auth: {
    user: AuthUser | null
    accessToken: string
    setSession: (token: string, user: AuthUser) => void
    reset: () => void
    asProject: string
    setAsProject: (code: string) => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const session = loadSession()
  return {
    auth: {
      user: session?.user ?? null,
      accessToken: session?.token ?? '',
      asProject: getCookie(AS_PROJECT_COOKIE) ?? '',
      setAsProject: (code) => {
        if (code) setCookie(AS_PROJECT_COOKIE, code, 60 * 60 * 24 * 30)
        else removeCookie(AS_PROJECT_COOKIE)
        set((state) => ({ auth: { ...state.auth, asProject: code } }))
      },
      setSession: (token, user) => {
        // shortcut: JS-readable cookie because the backend issues a Bearer JWT; move to an HttpOnly cookie set by the API when the backend supports it.
        const maxAge = Math.max(
          0,
          Math.floor((tokenExpiry(token) - Date.now()) / 1000)
        )
        setCookie(
          AUTH_COOKIE,
          encodeURIComponent(JSON.stringify({ token, user })),
          maxAge
        )
        set((state) => ({ auth: { ...state.auth, user, accessToken: token } }))
      },
      reset: () => {
        removeCookie(AUTH_COOKIE)
        removeCookie(AS_PROJECT_COOKIE)
        set((state) => ({
          auth: { ...state.auth, user: null, accessToken: '', asProject: '' },
        }))
      },
    },
  }
})

export function isAuthenticated(): boolean {
  const { accessToken } = useAuthStore.getState().auth
  return !!accessToken && tokenExpiry(accessToken) > Date.now()
}
