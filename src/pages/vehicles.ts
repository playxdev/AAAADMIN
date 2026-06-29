import { api } from '../api'
import type { ListResponse, Vehicle } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'

let allData: Vehicle[] = []
let pagination = initPagination()

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Vehicles</h1>
        <button id="add-btn" class="btn btn-primary">+ New Vehicle</button>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>License Plate</th>
                <th>Province</th>
                <th>Brand</th>
                <th>Color</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="data-tbody">
              <tr><td colspan="7" class="text-center py-8 text-slate-400 dark:text-slate-500"><svg class="spinner mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading...</td></tr>
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
    const res = await api.get<ListResponse<Vehicle>>('/vehicles')
    allData = res.data
    pagination.total = res.total
    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 dark:text-slate-500">No vehicles found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">${err instanceof Error ? err.message : 'Failed'}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(v => `
    <tr>
      <td class="font-mono text-sm">${esc(v.vehicle_id)}</td>
      <td class="font-mono font-medium">${esc(v.license_plate)}</td>
      <td class="text-sm">${esc(v.province || '-')}</td>
      <td class="text-sm">${esc(v.brand || '-')}</td>
      <td class="text-sm">${esc(v.color || '-')}</td>
      <td class="font-mono text-sm">${esc(v.user_id)}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm edit-btn" data-id="${esc(v.vehicle_id)}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${esc(v.vehicle_id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('.edit-btn').forEach(b =>
    b.addEventListener('click', () => showModal((b as HTMLElement).dataset.id))
  )
  tbody.querySelectorAll('.delete-btn').forEach(b =>
    b.addEventListener('click', () => deleteItem((b as HTMLElement).dataset.id!))
  )
}

function showModal(id?: string): void {
  const modal = document.getElementById('data-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-lg font-semibold mb-4">${id ? 'Edit' : 'New'} Vehicle</h3>
      <form id="form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="f-project-id">Project ID <span class="text-red-500">*</span></label>
          <input id="f-project-id" type="text" required placeholder="e.g. PRJ-xxx"/>
        </div>
        <div class="form-group">
          <label for="f-user-id">User ID <span class="text-red-500">*</span></label>
          <input id="f-user-id" type="text" required placeholder="e.g. USR-xxx"/>
        </div>
        <div class="form-group">
          <label for="f-plate">License Plate <span class="text-red-500">*</span></label>
          <input id="f-plate" type="text" required/>
        </div>
        <div class="form-group">
          <label for="f-province">Province</label>
          <input id="f-province" type="text"/>
        </div>
        <div class="form-group">
          <label for="f-brand">Brand</label>
          <input id="f-brand" type="text"/>
        </div>
        <div class="form-group">
          <label for="f-color">Color</label>
          <input id="f-color" type="text"/>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" id="modal-close" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary"><svg id="form-spinner" class="spinner hidden mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>${id ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  `

  document.getElementById('modal-close')!.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })

  if (id) loadItemData(id)

  document.getElementById('form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const errEl = document.getElementById('form-error')!
    const spinner = document.getElementById('form-spinner')!
    errEl.classList.add('hidden')
    spinner.classList.remove('hidden')

    const data = {
      project_id: (document.getElementById('f-project-id') as HTMLInputElement).value.trim(),
      user_id: (document.getElementById('f-user-id') as HTMLInputElement).value.trim(),
      license_plate: (document.getElementById('f-plate') as HTMLInputElement).value.trim(),
      province: (document.getElementById('f-province') as HTMLInputElement).value.trim() || null,
      brand: (document.getElementById('f-brand') as HTMLInputElement).value.trim() || null,
      color: (document.getElementById('f-color') as HTMLInputElement).value.trim() || null,
    }

    try {
      if (id) await api.put(`/vehicles/${id}`, data)
      else await api.post('/vehicles', data)
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

async function loadItemData(id: string): Promise<void> {
  try {
    const v = await api.get<Vehicle>(`/vehicles/${id}`)
    ;(document.getElementById('f-project-id') as HTMLInputElement).value = v.project_id
    ;(document.getElementById('f-user-id') as HTMLInputElement).value = v.user_id
    ;(document.getElementById('f-plate') as HTMLInputElement).value = v.license_plate
    ;(document.getElementById('f-province') as HTMLInputElement).value = v.province || ''
    ;(document.getElementById('f-brand') as HTMLInputElement).value = v.brand || ''
    ;(document.getElementById('f-color') as HTMLInputElement).value = v.color || ''
  } catch { /* ignore */ }
}

async function deleteItem(id: string): Promise<void> {
  if (!await showConfirm('Delete this vehicle?')) return
  try { await api.del(`/vehicles/${id}`); await loadData() }
  catch (err) { await showAlert(err instanceof Error ? err.message : 'Failed') }
}

function closeModal(): void { document.getElementById('data-modal')!.classList.add('hidden') }
function esc(s: string): string { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
