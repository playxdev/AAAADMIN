export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = 'confirm-modal-' + Date.now()
    const overlay = document.createElement('div')
    overlay.id = id
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-content max-w-sm text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <p class="text-sm text-slate-700 dark:text-slate-300 mb-6">${message}</p>
        <div class="flex gap-3 justify-center">
          <button id="${id}-cancel" class="btn btn-secondary">Cancel</button>
          <button id="${id}-ok" class="btn btn-danger">Delete</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    const ok = document.getElementById(`${id}-ok`)!
    const cancel = document.getElementById(`${id}-cancel`)!

    const cleanup = (result: boolean) => {
      overlay.remove()
      resolve(result)
    }

    ok.onclick = () => cleanup(true)
    cancel.onclick = () => cleanup(false)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false) })
  })
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const id = 'alert-modal-' + Date.now()
    const overlay = document.createElement('div')
    overlay.id = id
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-content max-w-sm text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm text-slate-700 dark:text-slate-300 mb-6">${message}</p>
        <button id="${id}-ok" class="btn btn-primary w-full justify-center">OK</button>
      </div>
    `
    document.body.appendChild(overlay)

    const ok = document.getElementById(`${id}-ok`)!
    const cleanup = () => { overlay.remove(); resolve() }
    ok.onclick = cleanup
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup() })
  })
}
