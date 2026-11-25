import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { safeRedirect } from '@/lib/utils'
import { UserAuthForm } from './user-auth-form'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setSession: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/stores/auth-store', async (orig) => ({
  ...(await orig<typeof import('@/stores/auth-store')>()),
  useAuthStore: () => ({ auth: { setSession: mocks.setSession } }),
}))

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: { post: mocks.post },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate,
}))

describe('safeRedirect', () => {
  it('allows only same-app paths', () => {
    expect(safeRedirect('/houses?page=2')).toBe('/houses?page=2')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
  })
})

describe('UserAuthForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows validation errors and does not call the API when empty', async () => {
    const screen = await render(<UserAuthForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await expect
      .element(screen.getByText('Please enter your admin name.'))
      .toBeVisible()
    await expect
      .element(screen.getByText('Please enter your password.'))
      .toBeVisible()
    await expect
      .element(
        screen.getByText('4 letters + 4 letters/digits, e.g. PROJ-0001.')
      )
      .toBeVisible()
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('logs in, stores the session and redirects', async () => {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
    const token = `${b64({ alg: 'HS256' })}.${b64({ sub: 'ADM-1', pid: 'PRJ-1', exp: 4e9 })}.sig`
    mocks.post.mockResolvedValue({
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
        project_code: 'PROJ-0001',
        project_name: 'หมู่บ้านทดสอบ',
        admin_level: 'ADMIN',
      },
    })
    const screen = await render(<UserAuthForm redirectTo='/visitors' />)
    await userEvent.fill(screen.getByLabelText('Project Code'), 'proj0001')
    await userEvent.fill(screen.getByLabelText('Admin Name'), 'admin')
    await userEvent.fill(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/visitors',
        replace: true,
      })
    )
    expect(mocks.post).toHaveBeenCalledWith('/login', {
      project_code: 'PROJ-0001',
      admin_name: 'admin',
      password: 'secret',
    })
    expect(mocks.setSession).toHaveBeenCalledWith(token, {
      id: 'ADM-1',
      fullName: 'admin',
      projectId: 'PRJ-1',
      projectCode: 'PROJ-0001',
      projectName: 'หมู่บ้านทดสอบ',
      level: 'ADMIN',
    })
  })

  it('stays on the page when login fails', async () => {
    mocks.post.mockRejectedValue(new Error('invalid credentials'))
    const screen = await render(<UserAuthForm />)
    await userEvent.fill(screen.getByLabelText('Project Code'), 'PROJ-0001')
    await userEvent.fill(screen.getByLabelText('Admin Name'), 'admin')
    await userEvent.fill(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalled())
    expect(mocks.setSession).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
