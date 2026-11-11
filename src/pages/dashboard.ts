import { api } from '../api'
import type { House, Resident, Visitor } from '../types'

const CARD = 'bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5'
const SPINNER = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'

export function render(): string {
  return `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-grid">
        ${`<div class="${CARD}">${SPINNER}</div>`.repeat(4)}
      </div>
    </div>
  `
}

export async function init(): Promise<void> {
  const statsGrid = document.getElementById('stats-grid')
  if (!statsGrid) return
  try {
    const [h, r, v] = await Promise.all([
      api.get<{ houses: House[] }>('/houses'),
      api.get<{ residents: Resident[] }>('/residents'),
      api.get<{ visitors: Visitor[] }>('/visitors', { valid: '1' }),
    ])
    const stats = [
      { label: 'Houses', count: h.houses.filter(x => x.is_active).length, color: 'text-blue-600' },
      { label: 'Residents', count: r.residents.filter(x => x.is_active).length, color: 'text-green-600' },
      { label: 'Overdue houses', count: h.houses.filter(x => x.is_active && x.payment_status !== 'NORMAL').length, color: 'text-orange-600' },
      { label: 'Valid visitors', count: v.visitors.filter(x => x.is_valid_now).length, color: 'text-purple-600' },
    ]
    statsGrid.innerHTML = stats.map(s => `
      <div class="${CARD}">
        <div class="text-sm text-slate-500 dark:text-slate-400">${s.label}</div>
        <div class="text-2xl font-bold ${s.color} mt-1">${s.count}</div>
      </div>
    `).join('')
  } catch (err) {
    statsGrid.innerHTML = `<div class="${CARD} text-red-500">${err instanceof Error ? err.message.replace(/</g, '&lt;') : 'Failed to load'}</div>`
  }
}
