import './style.css'
import { initTheme } from './theme'
import { isAuthenticated, logout } from './auth'
import { initRouter, register, navigate } from './router'
import * as loginPage from './pages/login'
import * as dashboard from './pages/dashboard'
import * as projects from './pages/projects'
import * as houses from './pages/houses'
import * as users from './pages/users'
import * as vehicles from './pages/vehicles'
import * as devices from './pages/devices'
import * as accessLogs from './pages/access-logs'
import * as blacklist from './pages/blacklist'

const protectedRoutes: Record<string, { render: () => string; init: () => void }> = {
  '/': { render: dashboard.render, init: dashboard.init },
  '/projects': { render: projects.render, init: projects.init },
  '/houses': { render: houses.render, init: houses.init },
  '/users': { render: users.render, init: users.init },
  '/vehicles': { render: vehicles.render, init: vehicles.init },
  '/devices': { render: devices.render, init: devices.init },
  '/access-logs': { render: accessLogs.render, init: accessLogs.init },
  '/blacklist': { render: blacklist.render, init: blacklist.init },
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
