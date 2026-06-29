import { api } from '../api'
import type { ListResponse, AccessLog } from '../types'

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-grid">
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></div>
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></div>
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></div>
        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5"><svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></div>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="font-semibold text-slate-900 dark:text-slate-100">Recent Access Logs</h2>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Plate</th>
                <th>Type</th>
                <th>User Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="recent-logs-tbody">
              <tr><td colspan="5" class="text-center py-8 text-slate-400 dark:text-slate-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

export async function init(): Promise<void> {
  try {
    const [projects, houses, users, vehicles] = await Promise.all([
      api.get<ListResponse<unknown>>('/projects'),
      api.get<ListResponse<unknown>>('/houses'),
      api.get<ListResponse<unknown>>('/users'),
      api.get<ListResponse<unknown>>('/vehicles'),
    ])

    const statsGrid = document.getElementById('stats-grid')
    if (!statsGrid) return

    const stats = [
      { label: 'Projects', count: projects.total, color: 'blue' },
      { label: 'Houses', count: houses.total, color: 'green' },
      { label: 'Users', count: users.total, color: 'purple' },
      { label: 'Vehicles', count: vehicles.total, color: 'orange' },
    ]

    statsGrid.innerHTML = stats.map(s => `
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
        <div class="text-sm text-slate-500 dark:text-slate-400">${s.label}</div>
        <div class="text-2xl font-bold text-${s.color}-600 mt-1">${s.count}</div>
      </div>
    `).join('')
  } catch {
    const statsGrid = document.getElementById('stats-grid')
    if (!statsGrid) return
    const fallback = ['Projects', 'Houses', 'Users', 'Vehicles']
    statsGrid.innerHTML = fallback.map(label => `
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
        <div class="text-sm text-slate-500 dark:text-slate-400">${label}</div>
        <div class="text-2xl font-bold text-slate-400 mt-1">0</div>
      </div>
    `).join('')
  }

  try {
    const logs = await api.get<ListResponse<AccessLog>>('/access-logs', { date_from: new Date(Date.now() - 86400000 * 7).toISOString() })
    const tbody = document.getElementById('recent-logs-tbody')
    if (!tbody) return
    if (logs.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 dark:text-slate-500">0/0 RECORD</td></tr>`
      return
    }
    tbody.innerHTML = logs.data.slice(0, 20).map(l => `
      <tr>
        <td class="text-sm">${new Date(l.access_date).toLocaleString()}</td>
        <td class="font-mono text-sm">${esc(l.license_plate || '-')}</td>
        <td>${esc(l.access_type || '-')}</td>
        <td>${esc(l.user_type || '-')}</td>
        <td><span class="badge ${l.is_success ? 'badge-success' : 'badge-danger'}">${l.is_success ? 'Success' : 'Failed'}</span></td>
      </tr>
    `).join('')
  } catch {
    const tbody = document.getElementById('recent-logs-tbody')
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 dark:text-slate-500">0/0 RECORD</td></tr>`
  }
}

function esc(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
