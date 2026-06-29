import { escapeHtml } from '../utils'

const KEY = 'aaa_sidebar_collapsed'

export function isSidebarCollapsed(): boolean {
  return localStorage.getItem(KEY) === '1'
}

export function setSidebarCollapsed(v: boolean): void {
  localStorage.setItem(KEY, v ? '1' : '0')
}

export function renderSidebar(currentPath: string): string {
  const collapsed = isSidebarCollapsed()

  const user = (() => {
    const stored = localStorage.getItem('aaa_user')
    if (!stored) return null
    try { return JSON.parse(stored) } catch { return null }
  })()

  const links = [
    { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/projects', label: 'Projects', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { path: '/houses', label: 'Houses', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/vehicles', label: 'Vehicles', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { path: '/devices', label: 'Devices', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { path: '/access-logs', label: 'Access Logs', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { path: '/blacklist', label: 'Blacklist', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
  ]

  return `
    <aside id="sidebar" class="${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 overflow-hidden">
      <div class="h-16 flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">A</div>
        <div class="${collapsed ? 'hidden' : ''}">
          <div class="font-semibold text-sm text-slate-800 dark:text-slate-200">AAA Admin</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Access Management</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        ${links.map(l => `
          <a href="#${l.path}" class="nav-link ${collapsed ? 'justify-center' : ''} ${currentPath === l.path ? 'active' : ''}" title="${l.label}">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${l.icon}"/>
            </svg>
            <span class="${collapsed ? 'hidden' : ''}">${l.label}</span>
          </a>
        `).join('')}
      </nav>
      ${user ? `
        <div class="p-3 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3 ${collapsed ? 'justify-center' : ''}">
            <div class="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">${user.full_name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div class="${collapsed ? 'hidden' : 'flex-1 min-w-0'}">
              <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">${escapeHtml(user.full_name || user.user_id)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(user.role || '')}</div>
            </div>
            <button id="logout-btn" class="text-slate-400 hover:text-red-500 transition-colors ${collapsed ? 'hidden' : ''}" title="Logout">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      ` : ''}
    </aside>
  `
}
