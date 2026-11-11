import { api } from '../api'
import type { House, Resident, ResidentDetail } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'
import { showToast } from '../toast'
import { escapeHtml as esc, fmtUtc } from '../utils'

let allData: Resident[] = []
let houses: House[] = []
let pagination = initPagination()

const errMsg = (err: unknown) => err instanceof Error ? err.message : 'Failed'
const houseLabel = (id: string | null) => houses.find(h => h.house_id === id)?.house_number ?? '-'

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Residents</h1>
        <button id="add-btn" class="btn btn-primary">+ New Resident</button>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>House</th>
                <th>Phone</th>
                <th>Line ID</th>
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
    const [r, h] = await Promise.all([
      api.get<{ residents: Resident[] }>('/residents'),
      api.get<{ houses: House[] }>('/houses'),
    ])
    allData = r.residents
    houses = h.houses
    pagination.total = allData.length
    if (allData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 dark:text-slate-500">No residents found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${esc(errMsg(err))}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(u => `
    <tr>
      <td class="font-medium">${esc(u.full_name)}</td>
      <td class="text-sm">${esc(houseLabel(u.house_id))}</td>
      <td class="text-sm">${esc(u.phone_number || '-')}</td>
      <td class="text-sm">${esc(u.line_id || '-')}</td>
      <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm manage-btn" data-id="${esc(u.user_id)}">Access</button>
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${esc(u.user_id)}">Edit</button>
          ${u.is_active ? `<button class="btn btn-danger btn-sm delete-btn" data-id="${esc(u.user_id)}">Disable</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('.manage-btn').forEach(b =>
    b.addEventListener('click', () => showAccess((b as HTMLElement).dataset.id!))
  )
  tbody.querySelectorAll('.edit-btn').forEach(b =>
    b.addEventListener('click', () => showModal((b as HTMLElement).dataset.id))
  )
  tbody.querySelectorAll('.delete-btn').forEach(b =>
    b.addEventListener('click', () => deactivate((b as HTMLElement).dataset.id!))
  )
}

function showModal(id?: string): void {
  const u = id ? allData.find(x => x.user_id === id) : undefined
  const modal = document.getElementById('data-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-lg font-semibold mb-4">${u ? 'Edit' : 'New'} Resident</h3>
      <form id="form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="f-full-name">Full Name <span class="text-red-500">*</span></label>
          <input id="f-full-name" type="text" required maxlength="128" value="${esc(u?.full_name ?? '')}"/>
        </div>
        <div class="form-group">
          <label for="f-house-id">House <span class="text-red-500">*</span></label>
          <select id="f-house-id" required>
            <option value="">-- select house --</option>
            ${houses.filter(h => h.is_active || h.house_id === u?.house_id).map(h => `<option value="${esc(h.house_id)}" ${h.house_id === u?.house_id ? 'selected' : ''}>${esc(h.house_number)}${h.zone_or_soi ? ` (${esc(h.zone_or_soi)})` : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f-phone">Phone Number</label>
          <input id="f-phone" type="text" maxlength="32" value="${esc(u?.phone_number ?? '')}"/>
        </div>
        <div class="form-group">
          <label for="f-line-id">Line ID</label>
          <input id="f-line-id" type="text" maxlength="64" value="${esc(u?.line_id ?? '')}"/>
        </div>
        ${u && !u.is_active ? `
        <div class="form-group">
          <label class="flex items-center gap-2"><input id="f-active" type="checkbox"/> Re-activate resident</label>
        </div>` : ''}
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" id="modal-close" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary"><svg id="form-spinner" class="spinner hidden mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>${u ? 'Update' : 'Create'}</button>
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
      full_name: val('f-full-name'),
      house_id: val('f-house-id'),
      phone_number: val('f-phone') || null,
      line_id: val('f-line-id') || null,
    }
    if ((document.getElementById('f-active') as HTMLInputElement | null)?.checked) data.is_active = true

    try {
      if (u) await api.patch(`/residents/${encodeURIComponent(u.user_id)}`, data)
      else await api.post('/residents', data)
      closeModal()
      await loadData()
    } catch (err) {
      errEl.textContent = errMsg(err)
      errEl.classList.remove('hidden')
    } finally {
      spinner.classList.add('hidden')
    }
  })
}

// ---------- Access: ทะเบียนรถ (ANPR) + RFID / QR / PIN + รหัสผูก LINE ----------

async function showAccess(id: string): Promise<void> {
  const modal = document.getElementById('data-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `<div class="modal-content"><svg class="spinner mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading...</div>`
  modal.onclick = (e) => { if (e.target === modal) closeModal() }

  let d: ResidentDetail
  try {
    d = await api.get<ResidentDetail>(`/residents/${encodeURIComponent(id)}`)
  } catch (err) {
    closeModal()
    await showAlert(esc(errMsg(err)))
    return
  }

  const vehicles = d.vehicles.filter(v => v.is_active)
  const creds = d.credentials.filter(c => c.is_active)

  modal.innerHTML = `
    <div class="modal-content max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">${esc(d.full_name)} <span class="text-sm font-normal text-slate-500">· ${esc(houseLabel(d.house_id))}</span></h3>
        <button type="button" id="modal-close" class="btn btn-secondary btn-sm">Close</button>
      </div>
      <div id="access-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>

      <h4 class="font-semibold mb-2">Vehicles (ANPR)</h4>
      <table class="data-table mb-3">
        <tbody>
          ${vehicles.length ? vehicles.map(v => `
            <tr>
              <td class="font-mono font-medium">${esc(v.license_plate)}</td>
              <td class="text-sm">${esc([v.province, v.brand, v.color].filter(Boolean).join(' · ') || '-')}</td>
              <td class="text-right"><button class="btn btn-danger btn-sm rm-vehicle" data-id="${esc(v.vehicle_id)}">Remove</button></td>
            </tr>`).join('') : `<tr><td class="text-sm text-slate-400">No vehicles</td></tr>`}
        </tbody>
      </table>
      <form id="vehicle-form" class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        <input id="v-plate" type="text" required maxlength="32" placeholder="Plate *" class="md:col-span-2"/>
        <input id="v-province" type="text" maxlength="64" placeholder="Province"/>
        <input id="v-brand" type="text" maxlength="64" placeholder="Brand"/>
        <input id="v-color" type="text" maxlength="32" placeholder="Color"/>
        <button type="submit" class="btn btn-primary btn-sm md:col-span-5 justify-center">+ Add Vehicle</button>
      </form>

      <h4 class="font-semibold mb-2">Credentials (RFID / QR / PIN)</h4>
      <table class="data-table mb-3">
        <tbody>
          ${creds.length ? creds.map(c => `
            <tr>
              <td><span class="badge badge-info">${esc(c.cred_type)}</span></td>
              <td class="text-sm">${esc(fmtUtc(c.valid_from))} → ${esc(fmtUtc(c.valid_until))}</td>
              <td class="text-right"><button class="btn btn-danger btn-sm rm-cred" data-id="${esc(c.credential_id)}">Revoke</button></td>
            </tr>`).join('') : `<tr><td class="text-sm text-slate-400">No credentials</td></tr>`}
        </tbody>
      </table>
      <form id="cred-form" class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <select id="c-type"><option value="RFID">RFID</option><option value="QRCODE">QRCODE</option><option value="PIN">PIN</option></select>
        <input id="c-value" type="text" required maxlength="256" placeholder="Card no. / QR / PIN *" autocomplete="off" class="md:col-span-2"/>
        <input id="c-until" type="date" title="Valid until (optional)"/>
        <button type="submit" class="btn btn-primary btn-sm col-span-2 md:col-span-4 justify-center">+ Add Credential</button>
      </form>

      <h4 class="font-semibold mb-2">LINE</h4>
      <div class="flex items-center gap-3">
        <button id="link-code-btn" class="btn btn-secondary btn-sm">Issue LINE link code</button>
        <span id="link-code" class="font-mono text-lg"></span>
      </div>
    </div>
  `

  const errEl = document.getElementById('access-error')!
  const run = async (fn: () => Promise<unknown>) => {
    errEl.classList.add('hidden')
    try {
      await fn()
      await showAccess(id)
    } catch (err) {
      errEl.textContent = errMsg(err)
      errEl.classList.remove('hidden')
    }
  }
  const val = (elId: string) => (document.getElementById(elId) as HTMLInputElement).value.trim()
  const enc = encodeURIComponent(id)

  document.getElementById('modal-close')!.addEventListener('click', closeModal)

  document.getElementById('vehicle-form')!.addEventListener('submit', (e) => {
    e.preventDefault()
    void run(() => api.post(`/residents/${enc}/vehicles`, {
      license_plate: val('v-plate'),
      province: val('v-province') || undefined,
      brand: val('v-brand') || undefined,
      color: val('v-color') || undefined,
    }))
  })

  document.getElementById('cred-form')!.addEventListener('submit', (e) => {
    e.preventDefault()
    const until = val('c-until')
    void run(() => api.post(`/residents/${enc}/credentials`, {
      cred_type: val('c-type'),
      value: val('c-value'),
      // วันที่เลือก = ใช้ได้ถึงสิ้นวันนั้นตามเวลาเครื่อง ส่งเป็น UTC รูปแบบเดียวกับ CURRENT_TIMESTAMP ของ SQLite
      valid_until: until ? new Date(`${until}T23:59:59`).toISOString().replace('T', ' ').slice(0, 19) : undefined,
    }))
  })

  modal.querySelectorAll('.rm-vehicle').forEach(b => b.addEventListener('click', async () => {
    if (!await showConfirm('Remove this vehicle?')) return
    void run(() => api.del(`/vehicles/${encodeURIComponent((b as HTMLElement).dataset.id!)}`))
  }))

  modal.querySelectorAll('.rm-cred').forEach(b => b.addEventListener('click', async () => {
    if (!await showConfirm('Revoke this credential?')) return
    void run(() => api.del(`/credentials/${encodeURIComponent((b as HTMLElement).dataset.id!)}`))
  }))

  document.getElementById('link-code-btn')!.addEventListener('click', async () => {
    errEl.classList.add('hidden')
    try {
      const r = await api.post<{ link_code: string }>(`/residents/${enc}/link-code`)
      // รหัสแสดงครั้งเดียว อายุ 24 ชม.
      document.getElementById('link-code')!.textContent = `${r.link_code} (24h)`
      showToast('Link code issued')
    } catch (err) {
      errEl.textContent = errMsg(err)
      errEl.classList.remove('hidden')
    }
  })
}

async function deactivate(id: string): Promise<void> {
  if (!await showConfirm('Disable this resident? All access methods will stop working.')) return
  try { await api.del(`/residents/${encodeURIComponent(id)}`); await loadData() }
  catch (err) { await showAlert(esc(errMsg(err))) }
}

function closeModal(): void { document.getElementById('data-modal')!.classList.add('hidden') }
