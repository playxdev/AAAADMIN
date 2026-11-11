export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// เวลาใน DB เป็น UTC แบบ "YYYY-MM-DD HH:MM:SS" -> เวลาเครื่อง
export function fmtUtc(s: string | null): string {
  return s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString() : '-'
}

export function getCurrentPath(): string {
  return window.location.hash.slice(1) || '/'
}

export function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/houses': 'Houses',
    '/users': 'Residents',
    '/visitors': 'Visitors',
  }
  return titles[path] || 'AAA Admin'
}
