import { api } from '../api'
import type { ListResponse, Project } from '../types'
import { showConfirm, showAlert } from '../components/modal'
import { initPagination, renderFooter, bindFooter, sliceData } from '../components/table-footer'

let allData: Project[] = []
let pagination = initPagination()

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
        <button id="add-project-btn" class="btn btn-primary">+ New Project</button>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="projects-tbody">
              <tr><td colspan="6" class="text-center py-8 text-slate-400 dark:text-slate-500"><svg class="spinner mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="footer-container">${renderFooter(pagination)}</div>
      </div>
    </div>
    <div id="project-modal" class="modal-overlay hidden"></div>
  `
}

export async function init(): Promise<void> {
  await loadData()

  document.getElementById('add-project-btn')?.addEventListener('click', () => showModal())
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
  const tbody = document.getElementById('projects-tbody')
  if (!tbody) return
  try {
    const res = await api.get<ListResponse<Project>>('/projects')
    allData = res.data
    pagination.total = res.total
    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 dark:text-slate-500">No projects found</td></tr>`
      const fc = document.getElementById('footer-container')
      if (fc) fc.innerHTML = renderFooter(pagination)
      return
    }
    renderTable()
    const fc = document.getElementById('footer-container')
    if (fc) fc.innerHTML = renderFooter(pagination)
    bindFooter((p) => goPage(p), () => pagination)
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${err instanceof Error ? err.message : 'Failed to load'}</td></tr>`
  }
}

function renderTable(): void {
  const tbody = document.getElementById('projects-tbody')
  if (!tbody) return
  const pageData = sliceData(allData, pagination.page)
  tbody.innerHTML = pageData.map(p => `
    <tr>
      <td class="font-mono text-sm">${esc(p.project_id)}</td>
      <td class="font-medium">${esc(p.project_name)}</td>
      <td class="text-sm text-slate-500 dark:text-slate-400">${esc(p.address || '-')}</td>
      <td class="text-sm">${esc(p.contact_number || '-')}</td>
      <td><span class="badge badge-success">${esc(p.id_status)}</span></td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm edit-project" data-id="${esc(p.project_id)}">Edit</button>
          <button class="btn btn-danger btn-sm delete-project" data-id="${esc(p.project_id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('')

  tbody.querySelectorAll('.edit-project').forEach(btn =>
    btn.addEventListener('click', () => showModal((btn as HTMLElement).dataset.id))
  )
  tbody.querySelectorAll('.delete-project').forEach(btn =>
    btn.addEventListener('click', () => deleteProject((btn as HTMLElement).dataset.id!))
  )
}

function showModal(projectId?: string): void {
  const modal = document.getElementById('project-modal')!
  modal.classList.remove('hidden')
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-lg font-semibold mb-4">${projectId ? 'Edit' : 'New'} Project</h3>
      <form id="project-form">
        <div id="form-error" class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4 hidden"></div>
        <div class="form-group">
          <label for="proj-name">Project Name <span class="text-red-500">*</span></label>
          <input id="proj-name" type="text" required/>
        </div>
        <div class="form-group">
          <label for="proj-address">Address</label>
          <textarea id="proj-address" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label for="proj-contact">Contact Number</label>
          <input id="proj-contact" type="text"/>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" id="modal-close" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">
            <svg id="form-spinner" class="spinner hidden mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            ${projectId ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  `

  const form = document.getElementById('project-form') as HTMLFormElement
  const errorEl = document.getElementById('form-error')!
  const spinner = document.getElementById('form-spinner')!

  document.getElementById('modal-close')!.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal() })

  if (projectId) {
    loadProjectData(projectId)
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.classList.add('hidden')
    spinner.classList.remove('hidden')

    const data = {
      project_name: (document.getElementById('proj-name') as HTMLInputElement).value.trim(),
      address: (document.getElementById('proj-address') as HTMLTextAreaElement).value.trim() || null,
      contact_number: (document.getElementById('proj-contact') as HTMLInputElement).value.trim() || null,
    }

    try {
      if (projectId) {
        await api.put(`/projects/${projectId}`, data)
      } else {
        await api.post('/projects', data)
      }
      closeModal()
      await loadData()
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'Failed to save'
      errorEl.classList.remove('hidden')
    } finally {
      spinner.classList.add('hidden')
    }
  })
}

async function loadProjectData(id: string): Promise<void> {
  try {
    const project = await api.get<Project>(`/projects/${id}`)
    ;(document.getElementById('proj-name') as HTMLInputElement).value = project.project_name
    ;(document.getElementById('proj-address') as HTMLTextAreaElement).value = project.address || ''
    ;(document.getElementById('proj-contact') as HTMLInputElement).value = project.contact_number || ''
  } catch { /* ignore */ }
}

async function deleteProject(id: string): Promise<void> {
  if (!await showConfirm('Are you sure you want to delete this project?')) return
  try {
    await api.del(`/projects/${id}`)
    await loadData()
  } catch (err) {
    await showAlert(err instanceof Error ? err.message : 'Failed to delete')
  }
}

function closeModal(): void {
  document.getElementById('project-modal')!.classList.add('hidden')
}

function esc(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
