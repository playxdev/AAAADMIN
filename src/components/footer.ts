declare const __APP_VERSION__: string

export function renderFooter(): string {
  return `
    <footer class="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
      <span>&copy; PlayDevX &middot; v${__APP_VERSION__}</span>
    </footer>
  `
}
