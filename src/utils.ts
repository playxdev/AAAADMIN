export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function getCurrentPath(): string {
  return window.location.hash.slice(1) || '/'
}

export function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/projects': 'Projects',
    '/houses': 'Houses',
    '/users': 'Users',
    '/vehicles': 'Vehicles',
    '/devices': 'Devices',
    '/access-logs': 'Access Logs',
    '/blacklist': 'Blacklist',
  }
  return titles[path] || 'AAA Admin'
}
