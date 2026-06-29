const PAGE_SIZE = 15

export interface PaginationState {
  page: number
  total: number
}

export function initPagination(): PaginationState {
  return { page: 1, total: 0 }
}

export function renderFooter(state: PaginationState): string {
  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE))
  const start = state.total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1
  const end = Math.min(state.page * PAGE_SIZE, state.total)

  const pages: number[] = []
  const maxVisible = 5
  let rangeStart = Math.max(1, state.page - Math.floor(maxVisible / 2))
  const rangeEnd = Math.min(totalPages, rangeStart + maxVisible - 1)
  rangeStart = Math.max(1, rangeEnd - maxVisible + 1)
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)

  return `
    <div id="table-footer" class="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-500 dark:text-slate-400">
      <span>Showing ${start}–${end} of ${state.total} records</span>
      <div class="flex items-center gap-1">
        <button data-page="prev" class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default" ${state.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
        ${pages.map(p => `
          <button data-page="${p}" class="w-8 h-8 rounded text-sm font-medium ${p === state.page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}">${p}</button>
        `).join('')}
        <button data-page="next" class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-default" ${state.page >= totalPages ? 'disabled' : ''}>&raquo; Next</button>
      </div>
    </div>
  `
}

export function bindFooter(onPage: (page: number) => void, state: () => PaginationState): void {
  const footer = document.getElementById('table-footer')
  if (!footer) return

  footer.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-page]') as HTMLElement | null
    if (!btn) return
    const s = state()
    const totalPages = Math.max(1, Math.ceil(s.total / PAGE_SIZE))
    let page = parseInt(btn.dataset.page || '0')
    if (btn.dataset.page === 'prev') page = Math.max(1, s.page - 1)
    else if (btn.dataset.page === 'next') page = Math.min(totalPages, s.page + 1)
    if (page >= 1 && page <= totalPages && page !== s.page) onPage(page)
  })
}

export function sliceData<T>(data: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE
  return data.slice(start, start + PAGE_SIZE)
}
