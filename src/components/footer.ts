declare const __APP_VERSION__: string

export function renderFooter(): string {
  return `
    <footer class="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
      <span>&copy; PlayDevX &middot; v${__APP_VERSION__}</span>
      <span id="system-status">Checking...</span>
    </footer>
  `
}

export function initFooter(): void {
  const statusEl = document.getElementById('system-status')
  if (statusEl) {
    fetch('/api/v1/health')
      .then(r => r.json())
      .then(d => { statusEl.textContent = d.status === 'ok' ? 'System Online' : 'System Issue' })
      .catch(() => { statusEl.textContent = 'Offline' })
  }
}
