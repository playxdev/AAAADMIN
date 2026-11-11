import { api } from '../api'
import type { House, Visitor, VisitorCreated } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'
import { escapeHtml as esc, fmtUtc } from '../utils'

let allData: Visitor[] = []
let houses: House[] = []
let pagination = initPagination()

const errMsg = (err: unknown) => err instanceof Error ? err.message : 'Failed'
const DURATIONS = ['1d', '7d', '14d', '30d', '1y', 'forever']

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Visitors</h1>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><input id="valid-only" type="checkbox" checked/> Valid only</label>
          <button id="add-btn" class="btn btn-primary">+ New Visitor</button>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>House</th>
                <th>Plate</th>
                <th>Purpose</th>
                <th>Valid Until</th>
                <th>Issued By</th>
                <th>Status</th>
                <th>Actions</th>
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
    <div id="data-modal" class="modal-overlay hidden"></div>
  `
}

export async function init(): Promise<void> {
  await loadData()
  document.getElementById('add-btn')?.addEventListener('click', () => showModal())
  document.getElementById('valid-only')?.addEventListener('change', () => void loadData())
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
  const validOnly = (document.getElementById('valid-only') as HTMLInputElement | null)?.checked
  try {
    const [v, h] = await Promise.all([
      api.get<{ visitors: Visitor[] }>('/visitors', validOnly ? { valid: '1' } : undefined),
      api.get<{ houses: House[] }>('/houses'),
    ])
    allData = v.visitors
    houses = h.houses
    pagination.total = allData.length
    if (allData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 dark:text-slate-500">No visitors found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-500">${esc(errMsg(err))}</td></tr>`
  }
}

function status(v: Visitor): [string, string] {
  if (v.id_status === 'REVOKED') return ['REVOKED', 'badge-danger']
  if (v.is_valid_now) return ['VALID', 'badge-success']
  return ['EXPIRED', 'badge-warning']
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(v => {
    const [label, badge] = status(v)
    return `
    <tr>
      <td class="font-medium">${esc(v.full_name || '-')}</td>
      <td class="text-sm">${esc(v.house_number || 'Common area')}</td>
      <td class="font-mono text-sm">${esc(v.license_plate || '-')}</td>
      <td class="text-sm">${esc(v.purpose || '-')}</td>
      <td class="text-sm">${esc(fmtUtc(v.valid_until))}</td>
      <td class="text-sm">${esc(v.issued_by_type || '-')}</td>
      <td><span class="badge ${badge}">${label}</span></td>
      <td>${v.id_status !== 'REVOKED' ? `<button class="btn btn-danger btn-sm revoke-btn" data-id="${esc(v.visitor_id)}">Revoke</button>` : ''}</td>
    </tr>`
  }).join('')

  tbody.querySelectorAll('.revoke-btn').forEach(b =>
    b.addEventListener('click', () => revoke((b as HTMLElement).dataset.id!))
  )
}

function showModal(): void {
  const modal = document.getElementById('data-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-lg font-semibold mb-4">New Visitor</h3>
      <form id="form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="f-house-id">House</label>
          <select id="f-house-id">
            <option value="">Common area (no house)</option>
            ${houses.filter(h => h.is_active).map(h => `<option value="${esc(h.house_id)}" ${h.house_code ? '' : 'disabled'}>${esc(h.house_number)}${h.house_code ? '' : ' (no house code)'}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f-duration">Duration <span class="text-red-500">*</span></label>
          <select id="f-duration">${DURATIONS.map(d => `<option value="${d}">${d}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label for="f-name">Name</label>
          <input id="f-name" type="text" maxlength="128"/>
        </div>
        <div class="form-group">
          <label for="f-phone">Phone Number</label>
          <input id="f-phone" type="text" maxlength="32"/>
        </div>
        <div class="form-group">
          <label for="f-plate">License Plate (ANPR)</label>
          <input id="f-plate" type="text" maxlength="32"/>
        </div>
        <div class="form-group">
          <label for="f-purpose">Purpose</label>
          <input id="f-purpose" type="text" maxlength="64" placeholder="e.g. delivery, guest"/>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-2"><input id="f-issue-code" type="checkbox" checked/> Issue Guest Code (QR / Keypad)</label>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" id="modal-close" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary"><svg id="form-spinner" class="spinner hidden mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>Create</button>
        </div>
      </form>
    </div>
  `

  document.getElementById('modal-close')!.addEventListener('click', closeModal)
  modal.onclick = (e) => { if (e.target === modal) closeModal() }

  document.getElementById('form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl = document.getElementById('form-error')!
    const spinner = document.getElementById('form-spinner')!
    errEl.classList.add('hidden')
    spinner.classList.remove('hidden')

    const val = (elId: string) => (document.getElementById(elId) as HTMLInputElement).value.trim()
    const data = {
      house_id: val('f-house-id') || undefined,
      duration: val('f-duration'),
      full_name: val('f-name') || undefined,
      phone_number: val('f-phone') || undefined,
      license_plate: val('f-plate') || undefined,
      purpose: val('f-purpose') || undefined,
      issue_code: (document.getElementById('f-issue-code') as HTMLInputElement).checked,
    }

    try {
      const r = await api.post<VisitorCreated>('/visitors', data)
      await loadData()
      showCreated(r)
    } catch (err) {
      errEl.textContent = errMsg(err)
      errEl.classList.remove('hidden')
    } finally {
      spinner.classList.add('hidden')
    }
  })
}

// Guest Code คืนจาก API ครั้งเดียว (DB เก็บแค่ hash) ต้องแสดงให้ admin จดทันที
function showCreated(r: VisitorCreated): void {
  const modal = document.getElementById('data-modal')!
  modal.onclick = null // กันปิดโดยไม่ตั้งใจก่อนจดโค้ด
  modal.innerHTML = `
    <div class="modal-content max-w-sm text-center">
      <h3 class="text-lg font-semibold mb-2">Visitor created</h3>
      ${r.code ? `
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">Guest Code (shown only once)</p>
        <div class="font-mono text-3xl font-bold mb-2">${esc(r.code)}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Keypad: ${esc(r.code.replace('+', ''))}</p>
      ` : ''}
      <p class="text-sm mb-6">Valid until ${esc(fmtUtc(r.valid_until))}</p>
      <button id="modal-close" class="btn btn-primary w-full justify-center">Done</button>
    </div>
  `
  document.getElementById('modal-close')!.addEventListener('click', closeModal)
}

async function revoke(id: string): Promise<void> {
  if (!await showConfirm('Revoke this visitor and its Guest Code?')) return
  try { await api.del(`/visitors/${encodeURIComponent(id)}`); await loadData() }
  catch (err) { await showAlert(esc(errMsg(err))) }
}

function closeModal(): void { document.getElementById('data-modal')!.classList.add('hidden') }
