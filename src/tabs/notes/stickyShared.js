export const NOTES_COLOR = '#ffcc00'

export const STICKY_COLORS = [
  { id: 'yellow', bg: '#fffde7', border: '#f9a825', text: '#5d4037', label: 'Yellow' },
  { id: 'pink', bg: '#fce4ec', border: '#e91e63', text: '#880e4f', label: 'Pink' },
  { id: 'mint', bg: '#e8f5e9', border: '#43a047', text: '#1b5e20', label: 'Mint' },
  { id: 'lavender', bg: '#ede7f6', border: '#7e57c2', text: '#311b92', label: 'Lavender' },
  { id: 'peach', bg: '#fff3e0', border: '#fb8c00', text: '#bf360c', label: 'Peach' },
  { id: 'sky', bg: '#e3f2fd', border: '#1e88e5', text: '#0d47a1', label: 'Sky' },
  { id: 'coral', bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', label: 'Coral' },
  { id: 'lilac', bg: '#f3e5f5', border: '#ab47bc', text: '#4a148c', label: 'Lilac' },
]

export const DEFAULT_TAGS = [
  { id: 'name-person', label: 'Name - Person', color: '#c966ff' },
  { id: 'name-place', label: 'Name - Place', color: '#3388ff' },
  { id: 'name-thing', label: 'Name - Thing', color: '#00ccaa' },
  { id: 'magic', label: 'Magic', color: '#ff44aa' },
  { id: 'lore', label: 'Lore', color: '#ffaa33' },
  { id: 'history', label: 'History', color: '#cc6644' },
  { id: 'language', label: 'Language', color: '#00e5cc' },
  { id: 'plot-idea', label: 'Plot Idea', color: '#ff3355' },
  { id: 'vibe', label: 'Vibe / Mood', color: '#9933ff' },
  { id: 'unsorted', label: 'Unsorted', color: '#666688' },
]

export const IDEAS_LS_KEY = 'gcomp_ideas'
export const IDEAS_CATEGORIES = [
  { id: 'names', label: 'Names' },
  { id: 'words', label: 'Words' },
  { id: 'phrases', label: 'Phrases' },
]

export function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export function stickyTilt(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h % 5) - 2) * 0.8
}

export function normalizeSticky(sticky, index = 0) {
  const pinnedStickies = sticky.pinned_stickies ?? sticky.pinned ?? false
  const pinnedJournal = sticky.pinned_journal ?? false
  return {
    size: 'normal',
    color: 'yellow',
    fontSize: '0.92em',
    archived: false,
    sort_order: index,
    journal_sort_order: index,
    ...sticky,
    pinned_stickies: pinnedStickies,
    pinned_journal: pinnedJournal,
    sort_order: Number.isFinite(Number(sticky.sort_order)) ? Number(sticky.sort_order) : index,
    journal_sort_order: Number.isFinite(Number(sticky.journal_sort_order)) ? Number(sticky.journal_sort_order) : index,
  }
}

export function sortStickies(list) {
  return [...list].sort((a, b) => {
    const ap = a.pinned_stickies ? 0 : 1
    const bp = b.pinned_stickies ? 0 : 1
    if (ap !== bp) return ap - bp
    const ao = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0
    const bo = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0
    if (ao !== bo) return ao - bo
    return new Date(b.created || 0) - new Date(a.created || 0)
  })
}

export function sortJournalPins(list) {
  return [...list].sort((a, b) => {
    const ao = Number.isFinite(Number(a.journal_sort_order)) ? Number(a.journal_sort_order) : 0
    const bo = Number.isFinite(Number(b.journal_sort_order)) ? Number(b.journal_sort_order) : 0
    if (ao !== bo) return ao - bo
    return new Date(b.created || 0) - new Date(a.created || 0)
  })
}

export function stickyTitle(text, limit = 50) {
  return (text || '').trim().slice(0, limit) || '(untitled)'
}

export function importNoteText(date = new Date()) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `Imported from sticky on ${yyyy}-${mm}-${dd}. Needs review.`
}

export function scrollAndFlashEntry(id) {
  const el = document.getElementById(`gcomp-entry-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const orig = el.style.background
  el.style.transition = 'background 0.3s'
  el.style.background = 'rgba(255, 220, 100, 0.4)'
  window.setTimeout(() => { el.style.background = orig }, 1500)
}
