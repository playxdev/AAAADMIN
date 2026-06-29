import { api } from '../api'
import type { ListResponse, House } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'

let allData: House[] = []
let pagination = initPagination()

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
                <th>House ID</th>
                <th>House Number</th>
                <th>Project</th>
                <th>Zone/Soi</th>
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
    const res = await api.get<ListResponse<House>>('/houses')
    allData = res.data
    pagination.total = res.total
    if (res.data.length === 0) {
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${err instanceof Error ? err.message : 'Failed'}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('data-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(h => `
    <tr>
      <td class="font-mono text-sm">${esc(h.house_id)}</td>
      <td class="font-medium">${esc(h.house_number)}</td>
      <td class="font-mono text-sm">${esc(h.project_id)}</td>
      <td class="text-sm">${esc(h.zone_or_soi || '-')}</td>
      <td><span class="badge badge-success">${esc(h.id_status)}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm edit-btn" data-id="${esc(h.house_id)}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${esc(h.house_id)}">Delete</button>
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
      <h3 class="text-lg font-semibold mb-4">${id ? 'Edit' : 'New'} House</h3>
      <form id="form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="f-project-id">Project ID <span class="text-red-500">*</span></label>
          <input id="f-project-id" type="text" required placeholder="e.g. PRJ-xxx"/>
        </div>
        <div class="form-group">
          <label for="f-number">House Number <span class="text-red-500">*</span></label>
          <input id="f-number" type="text" required placeholder="e.g. 123/45"/>
        </div>
        <div class="form-group">
          <label for="f-zone">Zone / Soi</label>
          <input id="f-zone" type="text" placeholder="e.g. Soi 1"/>
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
      house_number: (document.getElementById('f-number') as HTMLInputElement).value.trim(),
      zone_or_soi: (document.getElementById('f-zone') as HTMLInputElement).value.trim() || null,
    }

    try {
      if (id) await api.put(`/houses/${id}`, data)
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

async function loadItemData(id: string): Promise<void> {
  try {
    const h = await api.get<House>(`/houses/${id}`)
    ;(document.getElementById('f-project-id') as HTMLInputElement).value = h.project_id
    ;(document.getElementById('f-number') as HTMLInputElement).value = h.house_number
    ;(document.getElementById('f-zone') as HTMLInputElement).value = h.zone_or_soi || ''
  } catch { /* ignore */ }
}

async function deleteItem(id: string): Promise<void> {
  if (!await showConfirm('Delete this house?')) return
  try {
    await api.del(`/houses/${id}`)
    await loadData()
  } catch (err) {
    await showAlert(err instanceof Error ? err.message : 'Failed to delete')
  }
}

function closeModal(): void { document.getElementById('data-modal')!.classList.add('hidden') }
function esc(s: string): string { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
