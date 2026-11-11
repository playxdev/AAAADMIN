import './style.css'
import { initTheme } from './theme'
import { isAuthenticated, logout } from './auth'
import { initRouter, register, navigate } from './router'
import * as loginPage from './pages/login'
import * as dashboard from './pages/dashboard'
import * as houses from './pages/houses'
import * as users from './pages/users'
import * as visitors from './pages/visitors'

const protectedRoutes: Record<string, { render: () => string; init: () => void }> = {
  '/': { render: dashboard.render, init: dashboard.init },
  '/houses': { render: houses.render, init: houses.init },
  '/users': { render: users.render, init: users.init },
  '/visitors': { render: visitors.render, init: visitors.init },
}

register('/login', loginPage.render, loginPage.init)

for (const [path, route] of Object.entries(protectedRoutes)) {
  register(path, () => {
    if (!isAuthenticated()) {
      navigate('/login')
      return loginPage.render()
    }
    return route.render()
  }, () => {
    if (!isAuthenticated()) {
      navigate('/login')
      loginPage.init()
      return
    }
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      logout()
      navigate('/login')
    })
    route.init()
  })
}

initTheme()
initRouter()
