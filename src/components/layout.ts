import { renderSidebar, isSidebarCollapsed, setSidebarCollapsed } from './sidebar'
import { renderHeader } from './header'
import { renderFooter, initFooter } from './footer'
import { toggleThemeWithTransition, getTheme } from '../theme'

export function renderLayout(content: string, currentPath: string): string {
  return `
    <div class="flex h-screen bg-slate-100 dark:bg-slate-950">
      ${renderSidebar(currentPath)}
      <div class="flex-1 flex flex-col overflow-hidden">
        ${renderHeader(currentPath)}
        <main class="flex-1 overflow-y-auto p-6">
          ${content}
        </main>
        ${renderFooter()}
      </div>
    </div>
  `
}

export function initLayout(onSidebarToggle: () => void): void {
  // Theme toggle
  const tToggle = document.getElementById('theme-toggle')
  const iconSun = document.getElementById('theme-icon-sun')
  const iconMoon = document.getElementById('theme-icon-moon')
  if (tToggle && iconSun && iconMoon) {
    const updateIcon = () => {
      const isDark = getTheme() === 'dark'
      iconSun.classList.toggle('hidden', !isDark)
      iconMoon.classList.toggle('hidden', isDark)
    }
    updateIcon()
    tToggle.onclick = (e) => {
      toggleThemeWithTransition(e as MouseEvent)
      updateIcon()
    }
  }

  // Sidebar toggle
  const sbToggle = document.getElementById('sidebar-toggle')
  if (sbToggle) {
    sbToggle.onclick = () => {
      const collapsed = !isSidebarCollapsed()
      setSidebarCollapsed(collapsed)
      onSidebarToggle()
    }
  }

  // Footer health check
  initFooter()
}
