let toastTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  if (toastTimer) clearTimeout(toastTimer)

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)

  toastTimer = setTimeout(() => {
    toast.remove()
    toastTimer = null
  }, 3000)
}
