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

vi.mock('@/stores/auth-store', () => ({
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
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('logs in, stores the session and redirects', async () => {
    mocks.post.mockResolvedValue({
      data: {
        token: 't',
        admin_id: 'ADM-1',
        full_name: 'Admin One',
        role: 'ADMIN',
      },
    })
    const screen = await render(<UserAuthForm redirectTo='/devices' />)
    await userEvent.fill(screen.getByLabelText('Admin Name'), 'admin')
    await userEvent.fill(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/devices',
        replace: true,
      })
    )
    expect(mocks.post).toHaveBeenCalledWith('/auth/admin/login', {
      admin_name: 'admin',
      password: 'secret',
    })
    expect(mocks.setSession).toHaveBeenCalledWith('t', {
      id: 'ADM-1',
      fullName: 'Admin One',
      role: 'ADMIN',
    })
  })

  it('stays on the page when login fails', async () => {
    mocks.post.mockRejectedValue(new Error('invalid credentials'))
    const screen = await render(<UserAuthForm />)
    await userEvent.fill(screen.getByLabelText('Admin Name'), 'admin')
    await userEvent.fill(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalled())
    expect(mocks.setSession).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
