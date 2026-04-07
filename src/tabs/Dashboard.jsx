import { useState, useRef } from 'react'
import { CATS } from '../constants'

const TAB_LIST = [
  'wiki','glossary','characters','familytree','world','locations','map',
  'manuscript','scenes','timeline','eras','calendar',
  'inventory','wardrobe','items','outfitsnapshot','flags','questions','canon','spellings',
  'notes','journal','tools','sessionlog'
]

export default function Dashboard({ db, goTo }) {
  const { db: data } = db
  const [search, setSearch] = useState('')
  const [headerImg, setHeaderImg] = useState(() => {
    try { return db.settings?.dashboard_header_image || '' } catch { return '' }
  })
  const imgRef = useRef(null)

  let tot = 0, lk = 0, pv = 0, op = 0
  const fl = (data.flags || []).length
  Object.keys(CATS).forEach(c => {
    if (c === 'flags' || c === 'dashboard' || !data[c]) return
    tot += data[c].length
    data[c].forEach(e => {
      if (e.status === 'locked') lk++
      if (e.status === 'provisional') pv++
      if (e.status === 'open') op++
    })
  })

  // Recent entries
  const recent = []
  Object.entries(data).forEach(([cat, entries]) => {
    if (!Array.isArray(entries) || !CATS[cat]) return
    entries.forEach(e => {
      const ts = e.updated_at || e.updated || e.created
      if (ts) recent.push({ cat, name: e.name || e.title || e.display_name || e.word || '(unnamed)', ts, id: e.id })
    })
  })
  recent.sort((a, b) => new Date(b.ts) - new Date(a.ts))

  const questions = (data.questions || []).filter(q => q.status === 'open').slice(0, 10)
  const flags = (data.flags || []).slice(0, 10)
  const canonLocked = (data.canon || []).filter(c => c.status === 'locked').slice(0, 10)

  async function handleHeaderImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target.result
      setHeaderImg(url)
      db.saveSetting('dashboard_header_image', url)
    }
    reader.readAsDataURL(file)
  }

  // Search
  const searchHits = []
  if (search.trim().length > 1) {
    const q = search.trim().toLowerCase()
    Object.entries(data).forEach(([cat, entries]) => {
      if (!Array.isArray(entries) || !CATS[cat]) return
      entries.forEach(entry => {
        const name = entry.name || entry.title || entry.display_name || entry.word || ''
        if (name.toLowerCase().includes(q) || JSON.stringify(entry).toLowerCase().includes(q)) {
          searchHits.push({ cat, name: name || '(unnamed)', id: entry.id })
        }
      })
    })
  }

  const panelHead = (icon, label, color, count) => (
    <div style={{ fontSize: '0.77em', fontWeight: 700, color, textTransform: 'uppercase',
      letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
      display: 'flex', justifyContent: 'space-between' }}>
      <span>{icon} {label}</span>
      {count != null && <span style={{ color: 'var(--mut)' }}>+{count}</span>}
    </div>
  )

  const panelRow = (item, i, color, onClick) => (
    <div key={item.id || i} onClick={onClick}
      style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
        background: i % 2 === 0 ? 'var(--card)' : 'transparent',
        borderLeft: `2px solid ${color}` }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
      <div style={{ fontSize: '0.85em', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.name || item.title || '(unnamed)'}
      </div>
      {item.detail && <div style={{ fontSize: '0.69em', color: 'var(--mut)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '80vh', flexWrap: 'wrap' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--brd)',
        paddingRight: 8, marginRight: 16, paddingTop: 4 }}>
        <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--mut)', letterSpacing: '.15em',
          textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4,
          borderBottom: '1px solid var(--brd)' }}>Sections</div>
        {TAB_LIST.filter(k => CATS[k]).map(k => {
          const c = CATS[k]
          const count = k === 'flags' ? fl : (data[k] || []).length
          return (
            <div key={k} onClick={() => goTo(k)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', borderRadius: 6, marginBottom: 2, cursor: 'pointer',
                borderLeft: `3px solid ${c.c}`, transition: '.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '0.85em', color: 'var(--tx)' }}>{c.i} {c.l}</span>
              <span style={{ fontSize: '0.85em', fontFamily: "'Cinzel',serif", color: c.c, minWidth: 20, textAlign: 'right' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* ── RIGHT MAIN AREA ── */}
      <div style={{ flex: 1, minWidth: 260 }}>

        {/* Header image */}
        {headerImg && (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <img src={headerImg} alt="header"
              style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            <button onClick={() => { setHeaderImg(''); db.saveSetting('dashboard_header_image', '') }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)',
                border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: '0.85em', padding: '2px 8px' }}>
              ✕ Remove
            </button>
          </div>
        )}

        {/* Upload image button - subtle */}
        <div style={{ marginBottom: 10, textAlign: 'right' }}>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeaderImg} />
          <button onClick={() => imgRef.current?.click()}
            style={{ fontSize: '0.69em', padding: '2px 8px', borderRadius: 5, background: 'none',
              border: '1px solid var(--brd)', color: 'var(--mut)', cursor: 'pointer' }}>
            📷 {headerImg ? 'Change header image' : 'Upload header image'}
          </button>
        </div>

        {/* Stats */}
        <div className="dash-grid" style={{ marginBottom: 12 }}>
          <div className="dash-card">
            <div className="dash-num" style={{ color: 'var(--cc)' }}>{tot}</div>
            <div className="dash-label">Total Entries</div>
          </div>
          <div className="dash-card">
            <div className="dash-num" style={{ color: 'var(--sl)' }}>{lk}</div>
            <div className="dash-label">Locked</div>
          </div>
          <div className="dash-card">
            <div className="dash-num" style={{ color: 'var(--sp)' }}>{pv}</div>
            <div className="dash-label">Provisional</div>
          </div>
          <div className="dash-card">
            <div className="dash-num" style={{ color: 'var(--so)' }}>{op}</div>
            <div className="dash-label">Open</div>
          </div>
          <div className="dash-card" onClick={() => goTo('flags')} style={{ cursor: 'pointer' }}>
            <div className="dash-num" style={{ color: 'var(--cfl)' }}>{fl}</div>
            <div className="dash-label">🚩 Flags</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <input className="sx" style={{ width: '100%' }} placeholder="Search everything…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {searchHits.length > 0 && (
            <div style={{ marginTop: 6, background: 'var(--card)', border: '1px solid var(--brd)',
              borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ fontSize: '0.77em', color: 'var(--mut)', padding: '4px 10px', borderBottom: '1px solid var(--brd)' }}>
                {searchHits.length} result{searchHits.length !== 1 ? 's' : ''} — click to go to tab
              </div>
              {searchHits.slice(0, 30).map((h, i) => (
                <div key={h.id || i} onClick={() => { goTo(h.cat); setSearch('') }}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px',
                    borderBottom: '1px solid var(--brd)', cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)'}>
                  <span style={{ fontSize: '0.92em', color: 'var(--tx)' }}>{h.name}</span>
                  <span style={{ fontSize: '0.77em', color: CATS[h.cat]?.c || 'var(--mut)' }}>{CATS[h.cat]?.i} {CATS[h.cat]?.l}</span>
                </div>
              ))}
            </div>
          )}
          {search.trim().length > 1 && searchHits.length === 0 && (
            <div style={{ fontSize: '0.85em', color: 'var(--mut)', padding: '6px 4px' }}>No results for "{search}"</div>
          )}
        </div>

        {/* Four panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>

          {/* Recent */}
          <div>
            {panelHead('⏱', 'Recent', 'var(--tx)', null)}
            {recent.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No recent entries</div>
              : recent.slice(0, 12).map((r, i) => (
                <div key={r.id || i} onClick={() => goTo(r.cat)}
                  style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                    background: i % 2 === 0 ? 'var(--card)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
                  <div style={{ fontSize: '0.85em', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                  <div style={{ fontSize: '0.69em', color: CATS[r.cat]?.c || 'var(--mut)' }}>{CATS[r.cat]?.i} {CATS[r.cat]?.l}</div>
                </div>
              ))
            }
          </div>

          {/* Questions */}
          <div>
            {panelHead('?', 'Questions', 'var(--cq)', (data.questions || []).filter(q => q.status === 'open').length)}
            {questions.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No open questions</div>
              : questions.map((q, i) => panelRow(q, i, 'var(--cq)', () => goTo('questions')))
            }
          </div>

          {/* Flags */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            {panelHead('🚩', 'Flags', 'var(--cfl)', fl)}
            {flags.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No flags</div>
              : flags.map((f, i) => panelRow(f, i, 'var(--cfl)', () => goTo('flags')))
            }
          </div>

          {/* Canon Locked */}
          <div>
            {panelHead('✦', 'Canon', 'var(--ccn)', (data.canon || []).filter(c => c.status === 'locked').length)}
            {canonLocked.length === 0
              ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No locked canon yet</div>
              : canonLocked.map((c, i) => panelRow(c, i, 'var(--ccn)', () => goTo('canon')))
            }
          </div>

        </div>
      </div>
    </div>
  )
}
