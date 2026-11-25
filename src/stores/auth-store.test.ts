import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCookie } from '@/lib/cookies'

async function importAuthStore() {
  return await import('./auth-store')
}

function jwt(expSeconds: number) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ exp: expSeconds })}.sig`
}

const user = { id: 'ADM-1', fullName: 'admin', projectId: 'PRJ-1' }
const nowSec = () => Math.floor(Date.now() / 1000)

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })

  it('starts signed out when nothing is persisted', async () => {
    const { useAuthStore, isAuthenticated } = await importAuthStore()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('persists a valid session across reloads', async () => {
    const token = jwt(nowSec() + 3600)
    ;(await importAuthStore()).useAuthStore
      .getState()
      .auth.setSession(token, user)

    vi.resetModules()
    const { useAuthStore, isAuthenticated } = await importAuthStore()
    expect(useAuthStore.getState().auth.accessToken).toBe(token)
    expect(useAuthStore.getState().auth.user).toEqual(user)
    expect(isAuthenticated()).toBe(true)
  })

  it('treats an expired token as signed out', async () => {
    const { useAuthStore, isAuthenticated } = await importAuthStore()
    useAuthStore.getState().auth.setSession(jwt(nowSec() - 10), user)
    expect(isAuthenticated()).toBe(false)
    // max-age 0: an expired token is never persisted
    expect(getCookie('aaa_session')).toBeUndefined()
  })

  it('reset clears the session', async () => {
    const { useAuthStore, isAuthenticated } = await importAuthStore()
    useAuthStore.getState().auth.setSession(jwt(nowSec() + 3600), user)
    useAuthStore.getState().auth.reset()
    expect(isAuthenticated()).toBe(false)

    vi.resetModules()
    expect(
      (await importAuthStore()).useAuthStore.getState().auth.accessToken
    ).toBe('')
  })

  it('tokenExpiry returns 0 for garbage', async () => {
    const { tokenExpiry } = await importAuthStore()
    expect(tokenExpiry('not-a-jwt')).toBe(0)
    expect(tokenExpiry(jwt(100))).toBe(100_000)
  })
})
