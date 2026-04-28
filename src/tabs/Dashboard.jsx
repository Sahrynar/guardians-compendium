import { useMemo, useState } from 'react'
import { CATS, TAB_RAINBOW } from '../constants'
import EntryPreviewModal from '../components/common/EntryPreviewModal'

const TAB_LIST = [
  'wiki', 'glossary', 'characters', 'familytree', 'world', 'locations', 'map',
  'manuscript', 'scenes', 'timeline', 'calendar',
  'inventory', 'flags', 'questions', 'canon', 'spellings',
  'notes', 'tools', 'sessionlog',
]

const REVIEW_CATS = ['characters', 'locations', 'items', 'scenes', 'timeline', 'wiki', 'world', 'glossary', 'spellings', 'canon', 'flags', 'questions', 'notes']
const DASH_SEARCH_SCOPES = [
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

function getCategoryCount(data, cat, sessionLogCount = 0) {
  if (cat === 'tools') return null
  if (cat === 'notes') return (data.journal_captures || []).length + (data.notes || []).length + (data.ideas_list || []).length
  if (cat === 'sessionlog') return sessionLogCount
  return getCategoryEntries(data, cat).length
}

export default function Dashboard({ db, goTo, crossLink, sessionLogCount = 0 }) {
  const data = db.db
  const [searchScope, setSearchScope] = useState('all')
  const [dashSearch, setDashSearch] = useState('')
  const [previewEntry, setPreviewEntry] = useState(null)
  const [previewCategory, setPreviewCategory] = useState(null)

  let tot = 0
  let lk = 0
  let pv = 0
  let op = 0
  const fl = (data.flags || []).length

  Object.keys(CATS).forEach(cat => {
    if (cat === 'flags' || cat === 'dashboard') return
    const entries = getCategoryEntries(data, cat)
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
        rows.push({
          cat,
          name: getEntryName(e),
          ts,
          id: e.id,
          updated: e.updated,
          updated_at: e.updated_at,
          from_sticky: e.source === 'sticky',
          from_session: e.source === 'session-import',
        })
      })
    })
    rows.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    return rows
  }, [data])

  const reviewItems = useMemo(() => {
    const items = []
    REVIEW_CATS.forEach(cat => {
      getCategoryEntries(data, cat).forEach(e => {
        if (e.auto_imported === true || e.source === 'sticky' || e.source === 'session-import') {
          items.push({
            cat,
            name: getEntryName(e),
            id: e.id,
            source: e.source || 'unknown',
            updated: e.updated || e.updated_at || e.created_at || e.created,
          })
        }
      })
    })
    items.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))
    return items
  }, [data])
  const reviewCount = reviewItems.length

  const flags = data.flags || []

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
          results.push({ cat, id: e.id, name: getEntryName(e) })
        }
      })
    })
    return results.slice(0, 40)
  }, [dashSearch, searchScope, data])

  function openPreview(cat, id) {
    const entry = getCategoryEntries(data, cat).find(e => e.id === id)
    if (!entry) return
    setPreviewEntry(entry)
    setPreviewCategory(cat)
  }

  function openInTabForEdit() {
    if (!previewCategory || !previewEntry) return
    crossLink(previewCategory, previewEntry.id)
    setPreviewEntry(null)
    setPreviewCategory(null)
  }

  function goToPreviewEntry() {
    if (!previewCategory || !previewEntry) return
    crossLink(previewCategory, previewEntry.id)
    setPreviewEntry(null)
    setPreviewCategory(null)
  }

  const panelHead = (icon, label, color, count) => (
    <div style={{ fontSize: '0.77em', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--div)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
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
      <div style={{ maxWidth: 600, margin: '0 auto 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
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
            <div key={`${r.cat}-${r.id}-${i}`} onClick={() => openPreview(r.cat, r.id)}
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
          <div className="dash-label" style={{ color: '#fff' }}>Open</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--sp)' }}>{pv}</div>
          <div className="dash-label" style={{ color: '#fff' }}>Provisional</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: 'var(--sl)' }}>{lk}</div>
          <div className="dash-label" style={{ color: '#fff' }}>Locked</div>
        </div>
        <div className="dash-card" style={{ minWidth: 80, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: '#fff' }}>= {tot}</div>
          <div className="dash-label" style={{ color: '#fff' }}>Total</div>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--div)', margin: '0 8px', minHeight: 50 }} />

        <div className="dash-card" style={{ minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: '#fff' }}>{reviewCount}</div>
          <div className="dash-label" style={{ color: '#fff' }}>🔍 Review</div>
        </div>
        <div className="dash-card" onClick={() => goTo('flags')} style={{ cursor: 'pointer', minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: TAB_RAINBOW.flags }}>{fl}</div>
          <div className="dash-label" style={{ color: '#fff' }}>🚩 Flags</div>
        </div>
        <div className="dash-card" onClick={() => goTo('questions')} style={{ cursor: 'pointer', minWidth: 100, textAlign: 'center' }}>
          <div className="dash-num" style={{ color: TAB_RAINBOW.questions }}>{(data.questions || []).filter(q => q.status === 'open').length}</div>
          <div className="dash-label" style={{ color: '#fff' }}>❓ Questions</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
        <div style={{ flexShrink: 0, minWidth: 140, width: 'max-content', maxWidth: 220, borderRight: '2px solid var(--div)', paddingRight: 10, marginRight: 2 }}>
          {TAB_LIST.map(k => {
            const c = CATS[k]
            if (!c) return null
            const count = k === 'flags' ? fl : getCategoryCount(data, k, sessionLogCount)
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
                {count !== null && count !== undefined ? <span style={{ fontSize: '0.92em', fontFamily: "'Cinzel',serif", color }}>{count}</span> : null}
              </div>
            )
          })}
        </div>

        <div style={{ flex: '0 1 auto', minWidth: 80, maxWidth: 'calc(33.33% - 8px)', overflow: 'hidden' }}>
          {panelHead('⏱', 'Recent', 'var(--tx)', null)}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {recent.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No recent entries</div>
              : recent.slice(0, 15).map((r, i) => {
                  const sourceLabel = r.from_sticky ? '📌 from sticky'
                    : r.from_session ? '📥 from session'
                    : r.updated ? `✎ edit ${new Date(r.updated).toLocaleDateString()}`
                    : r.updated_at ? `✎ edit ${new Date(r.updated_at).toLocaleDateString()}`
                    : null
                  return panelRow({ ...r, detail: sourceLabel }, i, TAB_RAINBOW[r.cat] || 'var(--cc)', () => openPreview(r.cat, r.id))
                })}
          </div>
        </div>

        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('🔍', 'Review Queue', '#fff', reviewCount)}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {reviewItems.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>Nothing to review</div>
              : reviewItems.slice(0, 15).map((r, i) => panelRow({ ...r, detail: r.source === 'sticky' ? '📌 from sticky' : '📥 from session import' }, i, TAB_RAINBOW[r.cat] || 'var(--cc)', () => openPreview(r.cat, r.id)))}
          </div>
        </div>

        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('🚩', 'Flags', TAB_RAINBOW.flags, fl)}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {flags.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No flags</div>
              : flags.slice(0, 15).map((f, i) => panelRow({ ...f, detail: f.detail }, i, TAB_RAINBOW.flags, () => openPreview('flags', f.id)))}
          </div>
        </div>
      </div>

      <EntryPreviewModal
        open={!!previewEntry}
        entry={previewEntry}
        category={previewCategory}
        color={previewCategory ? (TAB_RAINBOW[previewCategory] || '#fff') : '#fff'}
        onClose={() => { setPreviewEntry(null); setPreviewCategory(null) }}
        onGoToEntry={goToPreviewEntry}
        onEdit={openInTabForEdit}
      />
    </div>
  )
}
