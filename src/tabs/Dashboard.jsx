import { useMemo, useState } from 'react'
import { CATS, TAB_RAINBOW } from '../constants'

const TAB_LIST = [
  'wiki', 'glossary', 'characters', 'familytree', 'world', 'locations', 'map',
  'manuscript', 'scenes', 'timeline', 'calendar',
  'inventory', 'flags', 'questions', 'canon', 'spellings',
  'notes', 'tools', 'sessionlog',
]

const REVIEW_CATS = ['characters', 'locations', 'items', 'scenes', 'timeline', 'wiki', 'world', 'glossary', 'spellings', 'canon', 'flags', 'questions', 'notes']
const DASH_SEARCH_SCOPES = [
  ['all', '🌐 All Tabs'],
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
  if (cat === 'glossary') return (data.wiki || []).filter(e => e.is_glossary)
  return data[cat] || []
}

function getCategoryCount(data, cat) {
  return getCategoryEntries(data, cat).length
}

export default function Dashboard({ db, goTo, crossLink }) {
  const data = db.db
  const [searchScope, setSearchScope] = useState('all')
  const [dashSearch, setDashSearch] = useState('')

  let tot = 0
  let lk = 0
  let pv = 0
  let op = 0
  const fl = (data.flags || []).length

  Object.keys(CATS).forEach(c => {
    if (c === 'flags' || c === 'dashboard') return
    const entries = getCategoryEntries(data, c)
    if (!Array.isArray(entries) || !entries.length) return
    tot += entries.length
    entries.forEach(e => {
      if (e.status === 'locked') lk++
      if (e.status === 'provisional') pv++
      if (e.status === 'open') op++
    })
  })

  const recent = useMemo(() => {
    const rows = []
    Object.keys(CATS).forEach(cat => {
      const entries = getCategoryEntries(data, cat)
      if (!Array.isArray(entries)) return
      entries.forEach(e => {
        const ts = e.updated_at || e.updated || e.created_at || e.created
        if (!ts) return
        rows.push({ cat, name: getEntryName(e), ts, id: e.id })
      })
    })
    rows.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    return rows
  }, [data])

  let reviewCount = 0
  const reviewItems = []
  REVIEW_CATS.forEach(cat => {
    getCategoryEntries(data, cat).forEach(e => {
      if (e.auto_imported === true || e.source === 'sticky' || e.source === 'session-import') {
        reviewCount++
        reviewItems.push({
          cat,
          name: getEntryName(e),
          id: e.id,
          source: e.source || 'unknown',
          updated: e.updated || e.updated_at || e.created_at || e.created,
        })
      }
    })
  })
  reviewItems.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))

  const flags = (data.flags || []).slice(0, 14)

  const searchResults = useMemo(() => {
    if (!dashSearch.trim()) return []
    const q = dashSearch.toLowerCase()
    const cats = searchScope === 'all' ? DASH_SEARCH_SCOPES.slice(1).map(s => s[0]) : [searchScope]
    const results = []
    cats.forEach(cat => {
      getCategoryEntries(data, cat).forEach(e => {
        const hay = [
          e.name, e.title, e.display_name, e.word, e.term, e.text,
          e.summary, e.notes, e.detail, e.content, e.definition, e.significance,
        ].filter(Boolean).join(' ').toLowerCase()
        if (hay.includes(q)) {
          results.push({
            cat,
            id: e.id,
            name: getEntryName(e),
          })
        }
      })
    })
    return results.slice(0, 40)
  }, [dashSearch, searchScope, data])

  const panelHead = (icon, label, color, count) => (
    <div style={{ fontSize: '0.77em', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{icon} {label}</span>
      {count != null && <span style={{ color: 'var(--mut)', fontWeight: 400, flexShrink: 0 }}>{count}</span>}
    </div>
  )

  const panelRow = (item, i, color, onClick) => (
    <div
      key={item.id || i}
      onClick={onClick}
      style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2, background: i % 2 === 0 ? 'var(--card)' : 'transparent', borderLeft: `2px solid ${color}`, minWidth: 0, overflow: 'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent' }}
    >
      <div style={{ fontSize: '0.85em', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
      {item.detail && <div style={{ fontSize: '0.69em', color: 'var(--mut)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>}
      {item.cat && <div style={{ fontSize: '0.69em', color, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CATS[item.cat]?.i} {CATS[item.cat]?.l}</div>}
    </div>
  )

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {searchResults.length === 0 && dashSearch && (
        <div style={{ padding: 10, fontSize: '0.85em', color: 'var(--mut)' }}>No matches.</div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <select value={searchScope} onChange={e => setSearchScope(e.target.value)}
          style={{ padding: '6px 10px', fontSize: '0.85em', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          {DASH_SEARCH_SCOPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input type="text" value={dashSearch} onChange={e => setDashSearch(e.target.value)}
          placeholder={`Search ${searchScope === 'all' ? 'everything' : searchScope}...`}
          style={{ flex: 1, padding: '6px 10px', fontSize: '0.92em', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
      </div>
      {searchResults.length > 0 && (
        <div style={{ marginBottom: 14, maxHeight: 300, overflowY: 'auto', border: '1px solid var(--brd)', borderRadius: 6, padding: 8, background: 'var(--card)' }}>
          {searchResults.map((r, i) => (
            <div key={`${r.cat}-${r.id}-${i}`} onClick={() => { crossLink(r.cat, r.id); setDashSearch('') }}
              style={{ padding: '4px 8px', fontSize: '0.85em', cursor: 'pointer', borderLeft: `3px solid ${TAB_RAINBOW[r.cat] || 'var(--cc)'}`, marginBottom: 2 }}>
              <span style={{ color: TAB_RAINBOW[r.cat] }}>{CATS[r.cat]?.i}</span> {r.name}
              <span style={{ fontSize: '0.77em', color: 'var(--mut)', marginLeft: 8 }}>({r.cat})</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--so)' }}>{op}</div>
          <div className="dash-label">Open</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--sp)' }}>{pv}</div>
          <div className="dash-label">Provisional</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--sl)' }}>{lk}</div>
          <div className="dash-label">Locked</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--cc)' }}>= {tot}</div>
          <div className="dash-label">Total</div>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--brd)', margin: '0 8px', minHeight: 50 }} />

        <div className="dash-card" style={{ minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--cc)' }}>{reviewCount}</div>
          <div className="dash-label">🔍 Review Queue</div>
        </div>
        <div className="dash-card" onClick={() => goTo('flags')} style={{ cursor: 'pointer', minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: TAB_RAINBOW.flags }}>{fl}</div>
          <div className="dash-label">🚩 Flags</div>
        </div>
        <div className="dash-card" onClick={() => goTo('questions')} style={{ cursor: 'pointer', minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: TAB_RAINBOW.questions }}>{(data.questions || []).filter(q => q.status === 'open').length}</div>
          <div className="dash-label">❓ Questions</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
        <div style={{ flexShrink: 0, minWidth: 140, width: 'max-content', maxWidth: 220, borderRight: '2px solid var(--brd)', paddingRight: 10, marginRight: 2 }}>
          {TAB_LIST.map(k => {
            const c = CATS[k]
            if (!c) return null
            const count = k === 'flags' ? fl : getCategoryCount(data, k)
            const color = TAB_RAINBOW[k] || 'var(--cc)'
            return (
              <div
                key={k}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer', borderLeft: `3px solid ${color}`, background: 'var(--card)', transition: '.12s' }}
                onClick={() => goTo(k)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)' }}
              >
                <span style={{ fontSize: '0.85em', color: 'var(--tx)', whiteSpace: 'nowrap' }}>{c.i} {c.l}</span>
                <span style={{ fontSize: '0.92em', fontFamily: "'Cinzel',serif", color }}>{count}</span>
              </div>
            )
          })}
        </div>

        <div style={{ flex: '0 1 auto', minWidth: 80, maxWidth: 'calc(33.33% - 8px)', overflow: 'hidden' }}>
          {panelHead('⏱', 'Recent', 'var(--tx)', null)}
          {recent.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No recent entries</div>
            : recent.slice(0, 14).map((r, i) => panelRow({ ...r, detail: null }, i, TAB_RAINBOW[r.cat] || 'var(--cc)', () => crossLink(r.cat, r.id)))}
        </div>

        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('🔍', 'Review Queue', 'var(--cc)', reviewCount)}
          {reviewItems.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>Nothing to review</div>
            : reviewItems.slice(0, 14).map((r, i) => panelRow({ ...r, detail: r.source === 'sticky' ? '📌 from sticky' : '📥 from session import' }, i, TAB_RAINBOW[r.cat] || 'var(--cc)', () => crossLink(r.cat, r.id)))}
        </div>

        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('🚩', 'Flags', TAB_RAINBOW.flags, fl)}
          {flags.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No flags</div>
            : flags.map((f, i) => panelRow({ ...f, detail: f.detail }, i, TAB_RAINBOW.flags, () => crossLink('flags', f.id)))}
        </div>
      </div>
    </div>
  )
}
