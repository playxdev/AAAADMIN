import { adminLogin } from '../auth'
import { navigate } from '../router'
import { showToast } from '../toast'
import { toggleThemeWithTransition, getTheme } from '../theme'

declare const __APP_VERSION__: string

export function render(): string {
  return `
    <div class="min-h-screen flex flex-col items-center justify-between bg-slate-100 dark:bg-slate-950 py-12 px-4">
      <div></div>
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto">A</div>
          <h2 class="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">AAA Admin</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to manage the access system</p>
        </div>
        <form id="login-form" class="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          <div id="login-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 hidden"></div>
          <div class="form-group">
            <label for="login-admin-name">Admin Name</label>
            <input id="login-admin-name" type="text" placeholder="Admin username" autocomplete="username"/>
          </div>
          <div class="form-group">
            <label for="login-admin-password">Password</label>
            <input id="login-admin-password" type="password" placeholder="Password" autocomplete="current-password"/>
          </div>
          <button type="submit" class="btn btn-primary w-full justify-center py-2.5" id="login-btn">
            <svg id="login-spinner" class="spinner hidden mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            Sign in
          </button>
        </form>
        <div class="flex justify-center">
          <button id="login-theme-toggle" class="w-12 h-12 flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Toggle theme">
            <svg id="login-theme-sun" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <svg id="login-theme-moon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="text-center text-sm text-slate-400 dark:text-slate-600 pb-4">
        &copy; PlayDevX &middot; v${__APP_VERSION__}
      </div>
    </div>
  `
}

export function init(): void {
  const form = document.getElementById('login-form') as HTMLFormElement
  const errorEl = document.getElementById('login-error')!
  const btn = document.getElementById('login-btn')!
  const spinner = document.getElementById('login-spinner')!

  // Theme toggle
  const themeToggle = document.getElementById('login-theme-toggle')!
  const iconSun = document.getElementById('login-theme-sun')!
  const iconMoon = document.getElementById('login-theme-moon')!
  const updateIcon = () => {
    const isDark = getTheme() === 'dark'
    iconSun.classList.toggle('hidden', !isDark)
    iconMoon.classList.toggle('hidden', isDark)
  }
  updateIcon()
  themeToggle.addEventListener('click', (e) => {
    toggleThemeWithTransition(e as MouseEvent)
    updateIcon()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.classList.add('hidden')
    spinner.classList.remove('hidden')
    btn.classList.add('opacity-50', 'pointer-events-none')

    try {
      const adminName = (document.getElementById('login-admin-name') as HTMLInputElement).value.trim()
      const password = (document.getElementById('login-admin-password') as HTMLInputElement).value.trim()
      if (!adminName || !password) {
        throw new Error('Please fill in all fields')
      }
      await adminLogin(adminName, password)
      showToast('Login successful')
      navigate('/')
    } catch (err) {
      spinner.classList.add('hidden')
      btn.classList.remove('opacity-50', 'pointer-events-none')
      errorEl.textContent = err instanceof Error ? err.message : 'Login failed'
      errorEl.classList.remove('hidden')
    }
  })
}