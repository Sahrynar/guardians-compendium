import { useMemo, useState, useRef, useEffect } from 'react'
import { CATS, TAB_RAINBOW } from '../../constants'

// ── Scoped global search (PATCH7I) ──────────────────────────────
// Lives in the nav-top middle cell on EVERY tab. Two jobs at once:
//  1. Typing live-filters the current tab (navSearch, unchanged from 7F)
//  2. A results dropdown offers cross-tab jumps, scoped by the picker
// Moved up from the Dashboard, which previously owned this search.

const SCOPES = [
  ['all', '🌐 Global (everything)'],
  ['characters', '👤 Characters'],
  ['wiki', '📖 Wiki'],
  ['glossary', '📚 Glossary'],
  ['locations', '📍 Locations'],
  ['world', '🌍 World'],
  ['scenes', '🎬 Scenes'],
  ['timeline', '⏳ Timeline'],
  ['manuscript', '📜 Manuscript'],
  ['flags', '🚩 Flags'],
  ['questions', '❓ Questions'],
  ['canon', '✦ Canon'],
  ['spellings', '🔤 Spellings'],
  ['notes', '📝 Notes'],
]

function getEntryName(e) {
  return e.name || e.title || e.display_name || e.word || e.term || e.text?.slice(0, 50) || '(unnamed)'
}

function getCategoryEntries(data, cat) {
  if (cat === 'glossary') return data.glossary || (data.wiki || []).filter(e => e.is_glossary)
  if (cat === 'familytree') return data.family_tree || []
  if (cat === 'map') return data.maps || []
  if (cat === 'calendar') return data.calendar_entries || []
  if (cat === 'sessionlog') return data.session_log || data.session_logs || []
  return data[cat] || []
}

export default function GlobalSearch({ db, navSearch, setNavSearch, crossLink }) {
  const [scope, setScope] = useState('all')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const data = db.db

  const results = useMemo(() => {
    const q = (navSearch || '').trim().toLowerCase()
    if (!q) return []
    const cats = scope === 'all' ? SCOPES.slice(1).map(s => s[0]) : [scope]
    const out = []
    cats.forEach(cat => {
      getCategoryEntries(data, cat).forEach(e => {
        const hay = [
          e.name, e.title, e.display_name, e.word, e.term, e.text,
          e.summary, e.notes, e.detail, e.content, e.definition, e.significance,
        ].filter(Boolean).join(' ').toLowerCase()
        if (hay.includes(q)) out.push({ cat, id: e.id, name: getEntryName(e) })
      })
    })
    return out.slice(0, 40)
  }, [navSearch, scope, data])

  // Ctrl+K / Cmd+K focuses the search from anywhere
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(r) {
    crossLink(r.cat === 'glossary' ? 'glossary' : r.cat, r.id)
    setNavSearch('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const showDrop = open && (navSearch || '').trim().length > 0

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'flex', gap: 6, alignItems: 'center', width: 'clamp(200px, 46vw, 560px)', minWidth: 0 }}>
      <select
        value={scope}
        onChange={e => setScope(e.target.value)}
        title="Search scope"
        style={{ padding: '6px 6px', fontSize: '0.8em', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', maxWidth: 130, flexShrink: 0 }}
      >
        {SCOPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <input
        ref={inputRef}
        type="text"
        className="global-top-search"
        value={navSearch}
        onChange={e => { setNavSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setNavSearch(''); setOpen(false); e.currentTarget.blur() }
          if (e.key === 'Enter' && results.length > 0) pick(results[0])
        }}
        placeholder={`Search ${scope === 'all' ? 'everything' : scope}…  (Ctrl+K)`}
        style={{ flex: 1, minWidth: 0, padding: '6px 12px', fontSize: '0.9em', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}
      />
      {showDrop && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 320, overflowY: 'auto', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 8, padding: 6, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {results.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: '0.85em', color: 'var(--mut)' }}>
              No matches{scope !== 'all' ? ` in ${scope}` : ''}. The current tab still filters live as you type.
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.cat}-${r.id}-${i}`}
              onClick={() => pick(r)}
              style={{ padding: '5px 8px', fontSize: '0.85em', cursor: 'pointer', borderLeft: `3px solid ${TAB_RAINBOW[r.cat] || 'var(--cc)'}`, marginBottom: 2, borderRadius: 4, background: i % 2 === 0 ? 'var(--card)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent' }}
            >
              <span style={{ color: TAB_RAINBOW[r.cat] }}>{CATS[r.cat]?.i}</span> {r.name}
              <span style={{ fontSize: '0.77em', color: 'var(--mut)', marginLeft: 8 }}>({r.cat})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
