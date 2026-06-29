import { api } from '../api'
import type { ListResponse, AccessLog } from '../types'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'

let allData: AccessLog[] = []
let pagination = initPagination()

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Access Logs</h1>
        <div class="flex gap-2">
          <input id="filter-plate" type="text" placeholder="Filter by plate..." class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"/>
          <input id="filter-date-from" type="date" class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"/>
          <input id="filter-date-to" type="date" class="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200"/>
          <button id="filter-btn" class="btn btn-primary btn-sm">Filter</button>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Time</th>
                <th>Plate</th>
                <th>Type</th>
                <th>User Type</th>
                <th>Device</th>
                <th>Project</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="data-tbody">
              <tr><td colspan="8" class="text-center py-8 text-slate-400 dark:text-slate-500"><svg class="spinner mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="footer-container">${renderFooter(pagination)}</div>
      </div>
    </div>
  `
}

export async function init(): Promise<void> {
  await loadData()
  document.getElementById('filter-btn')?.addEventListener('click', () => loadData())
}

function goPage(page: number): void {
  pagination.page = page
  renderTable()
  const fc = document.getElementById('footer-container')
  if (fc) fc.innerHTML = renderFooter(pagination)
  bindFooter((p) => goPage(p), () => pagination)
}

async function loadData(): Promise<void> {
  pagination = initPagination()
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return

  const params: Record<string, string> = {}
  const plate = (document.getElementById('filter-plate') as HTMLInputElement)?.value?.trim()
  const dateFrom = (document.getElementById('filter-date-from') as HTMLInputElement)?.value
  const dateTo = (document.getElementById('filter-date-to') as HTMLInputElement)?.value
  if (plate) params.license_plate = plate
  if (dateFrom) params.date_from = new Date(dateFrom).toISOString()
  if (dateTo) params.date_to = new Date(dateTo).toISOString()

  try {
    const res = await api.get<ListResponse<AccessLog>>('/access-logs', params)
    allData = res.data
    pagination.total = res.total
    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 dark:text-slate-500">No access logs found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-500">${err instanceof Error ? err.message : 'Failed'}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(l => `
    <tr>
      <td class="font-mono text-sm">${esc(l.log_id)}</td>
      <td class="text-sm">${new Date(l.access_date).toLocaleString()}</td>
      <td class="font-mono text-sm">${esc(l.license_plate || '-')}</td>
      <td class="text-sm">${esc(l.access_type || '-')}</td>
      <td class="text-sm">${esc(l.user_type || '-')}</td>
      <td class="font-mono text-sm">${esc(l.device_id || '-')}</td>
      <td class="font-mono text-sm">${esc(l.project_id)}</td>
      <td><span class="badge ${l.is_success ? 'badge-success' : 'badge-danger'}">${l.is_success ? 'Success' : 'Failed'}</span></td>
    </tr>
  `).join('')
}

function esc(s: string): string { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
