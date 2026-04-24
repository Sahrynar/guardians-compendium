export function scrollAndFlashEntry(id) {
  const el = document.getElementById(`gcomp-entry-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const orig = el.style.background
  el.style.transition = 'background 0.3s'
  el.style.background = 'rgba(255, 220, 100, 0.4)'
  window.setTimeout(() => { el.style.background = orig }, 1500)
}
