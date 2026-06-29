import { renderLayout, initLayout } from './components/layout'
import { getCurrentPath } from './utils'

type RouteHandler = () => string
type RouteInit = () => void

interface Route {
  handler: RouteHandler
  init?: RouteInit
}

const routes = new Map<string, Route>()

export function register(path: string, handler: RouteHandler, init?: RouteInit): void {
  routes.set(path, { handler, init })
}

export function navigate(path: string): void {
  window.location.hash = path
}

function renderApp(): void {
  const currentPath = getCurrentPath()
  const route = routes.get(currentPath)

  const app = document.getElementById('app')
  if (!app) return

  try {
    if (route) {
      if (currentPath === '/login') {
        app.innerHTML = route.handler()
        void Promise.resolve(route.init?.()).catch(e => console.error('login init failed:', e))
        return
      }
      app.innerHTML = renderLayout(route.handler(), currentPath)
      initLayout(() => renderApp())
      void Promise.resolve(route.init?.()).catch(e => console.error('page init failed:', e))
    } else {
      app.innerHTML = renderLayout(renderNotFound(), currentPath)
      initLayout(() => renderApp())
    }
  } catch (err) {
    console.error('renderApp failed:', err)
    app.innerHTML = `<div class="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-950"><p class="text-red-500">Something went wrong. <a href="#/" class="underline">Go to Dashboard</a></p></div>`
  }
}

export { renderApp }

function renderNotFound(): string {
  return `
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-200">404</h2>
      <p class="text-slate-500 dark:text-slate-400 mt-2">Page not found</p>
      <a href="#/" class="btn btn-primary mt-4 inline-flex">Go to Dashboard</a>
    </div>
  `
}

export { getCurrentPath, getPageTitle, escapeHtml } from './utils'

export function initRouter(): void {
  window.addEventListener('hashchange', renderApp)
  window.addEventListener('DOMContentLoaded', renderApp)
  if (!window.location.hash) {
    window.location.hash = '#/'
  } else {
    renderApp()
  }
}
