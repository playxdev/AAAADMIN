import { api } from '../api'
import type { House } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'
import { escapeHtml as esc } from '../utils'

let allData: House[] = []
let pagination = initPagination()

const PAYMENT_BADGE: Record<string, string> = {
  NORMAL: 'badge-success',
  OVERDUE: 'badge-warning',
  OVERDUE_SEVERE: 'badge-danger',
}

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Houses</h1>
        <button id="add-btn" class="btn btn-primary">+ New House</button>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>House Number</th>
                <th>House Code</th>
                <th>Zone/Soi</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="data-tbody">
              <tr><td colspan="6" class="text-center py-8 text-slate-400 dark:text-slate-500"><svg class="spinner mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="footer-container">${renderFooter(pagination)}</div>
      </div>
    </div>
    <div id="data-modal" class="modal-overlay hidden"></div>
  `
}

export async function init(): Promise<void> {
  await loadData()
  document.getElementById('add-btn')?.addEventListener('click', () => showModal())
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
  try {
    const res = await api.get<{ houses: House[] }>('/houses')
    allData = res.houses
    pagination.total = allData.length
    if (allData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 dark:text-slate-500">No houses found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${esc(err instanceof Error ? err.message : 'Failed')}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(h => `
    <tr>
      <td class="font-medium">${esc(h.house_number)}</td>
      <td class="font-mono text-sm">${esc(h.house_code || '-')}</td>
      <td class="text-sm">${esc(h.zone_or_soi || '-')}</td>
      <td><span class="badge ${PAYMENT_BADGE[h.payment_status] ?? 'badge-info'}">${esc(h.payment_status)}</span></td>
      <td><span class="badge ${h.is_active ? 'badge-success' : 'badge-danger'}">${h.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm edit-btn" data-id="${esc(h.house_id)}">Edit</button>
          <button class="btn ${h.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm toggle-btn" data-id="${esc(h.house_id)}">${h.is_active ? 'Disable' : 'Enable'}</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('.edit-btn').forEach(b =>
    b.addEventListener('click', () => showModal((b as HTMLElement).dataset.id))
  )
  tbody.querySelectorAll('.toggle-btn').forEach(b =>
    b.addEventListener('click', () => toggleActive((b as HTMLElement).dataset.id!))
  )
}

function showModal(id?: string): void {
  const h = id ? allData.find(x => x.house_id === id) : undefined
  const modal = document.getElementById('data-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-lg font-semibold mb-4">${h ? 'Edit' : 'New'} House</h3>
      <form id="form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="f-number">House Number <span class="text-red-500">*</span></label>
          <input id="f-number" type="text" required maxlength="32" placeholder="e.g. 123/45" value="${esc(h?.house_number ?? '')}"/>
        </div>
        <div class="form-group">
          <label for="f-code">House Code (ใช้นำหน้า Guest Code)</label>
          <input id="f-code" type="text" inputmode="numeric" pattern="[1-9][0-9]{0,5}" maxlength="6" placeholder="e.g. 9801" value="${esc(h?.house_code ?? '')}"/>
        </div>
        <div class="form-group">
          <label for="f-zone">Zone / Soi</label>
          <input id="f-zone" type="text" maxlength="64" placeholder="e.g. Soi 1" value="${esc(h?.zone_or_soi ?? '')}"/>
        </div>
        ${h ? `
        <div class="form-group">
          <label for="f-payment">Payment Status</label>
          <select id="f-payment">
            ${['NORMAL', 'OVERDUE', 'OVERDUE_SEVERE'].map(s => `<option value="${s}" ${h.payment_status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>` : ''}
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" id="modal-close" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary"><svg id="form-spinner" class="spinner hidden mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>${h ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  `

  document.getElementById('modal-close')!.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })

  document.getElementById('form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl = document.getElementById('form-error')!
    const spinner = document.getElementById('form-spinner')!
    errEl.classList.add('hidden')
    spinner.classList.remove('hidden')

    const val = (elId: string) => (document.getElementById(elId) as HTMLInputElement).value.trim()
    const data: Record<string, unknown> = {
      house_number: val('f-number'),
      house_code: val('f-code') || null,
      zone_or_soi: val('f-zone') || null,
    }
    if (h) data.payment_status = val('f-payment')

    try {
      if (h) await api.patch(`/houses/${encodeURIComponent(h.house_id)}`, data)
      else await api.post('/houses', data)
      closeModal()
      await loadData()
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : 'Failed to save'
      errEl.classList.remove('hidden')
    } finally {
      spinner.classList.add('hidden')
    }
  })
}

async function toggleActive(id: string): Promise<void> {
  const h = allData.find(x => x.house_id === id)
  if (!h) return
  if (h.is_active && !await showConfirm('Disable this house?')) return
  try {
    await api.patch(`/houses/${encodeURIComponent(id)}`, { is_active: !h.is_active })
    await loadData()
  } catch (err) {
    await showAlert(esc(err instanceof Error ? err.message : 'Failed'))
  }
}

function closeModal(): void { document.getElementById('data-modal')!.classList.add('hidden') }
