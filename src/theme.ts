const KEY = 'aaa_theme'

export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export function initTheme(): void {
  const theme = getTheme()
  setTheme(theme)
}

export function toggleThemeWithTransition(event: MouseEvent): Theme {
  const isViewTransitionSupported = 'startViewTransition' in document
    && typeof (document as any).startViewTransition === 'function'

  if (!isViewTransitionSupported) {
    return toggleTheme()
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  const root = document.documentElement
  root.style.setProperty('--tx', `${x}px`)
  root.style.setProperty('--ty', `${y}px`)
  root.style.setProperty('--tr', `${endRadius}px`)

  const next = getTheme() === 'dark' ? 'light' : 'dark'

  const transition = (document as any).startViewTransition(() => {
    setTheme(next)
  })

  transition.finished.then(() => {
    root.style.removeProperty('--tx')
    root.style.removeProperty('--ty')
    root.style.removeProperty('--tr')
  })

  return next
}
