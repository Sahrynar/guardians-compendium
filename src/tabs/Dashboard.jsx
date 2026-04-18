import { useState, useRef } from 'react'
import { CATS } from '../constants'

const TAB_LIST = [
  'wiki','glossary','characters','familytree','world','locations','map',
  'manuscript','scenes','timeline','eras','calendar',
  'inventory','wardrobe','items','flags','questions','canon','spellings',
  'notes','journal','tools','sessionlog'
]

const RAINBOW = [
  '#ff69b4','#ff6b6b','#e63946','#f4442e','#ff8c00','#ffb700','#ffd600',
  '#aacc00','#38b000','#0fb5a0','#00b4d8','#4cc9f0','#3a86ff','#4361ee',
  '#7b2d8b','#9d4edd','#c77dff','#ff48c4'
]
const rc = (i) => RAINBOW[i % RAINBOW.length]

export default function Dashboard({ db, goTo, navSearch, setNavSearch }) {
  const { db: data } = db
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

  // Recent entries across all categories
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

  function handleHeaderImg(e) {
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

  const panelRow = (item, i, color, onClick) => (
    <div key={item.id || i} onClick={onClick}
      style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
        background: i % 2 === 0 ? 'var(--card)' : 'transparent',
        borderLeft: `2px solid ${color}`, minWidth: 0, overflow: 'hidden' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
      <div style={{ fontSize: '0.85em', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.name}
      </div>
      {item.detail && <div style={{ fontSize: '0.69em', color: 'var(--mut)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>}
      {item.cat && <div style={{ fontSize: '0.69em', color: color, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CATS[item.cat]?.i} {CATS[item.cat]?.l}</div>}
    </div>
  )

  const panelHead = (icon, label, color, count) => (
    <div style={{ fontSize: '0.77em', fontWeight: 700, color, textTransform: 'uppercase',
      letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      minWidth: 0, overflow: 'hidden' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{icon} {label}</span>
      {count != null && <span style={{ color: 'var(--mut)', fontWeight: 400, flexShrink: 0 }}>+{count}</span>}
    </div>
  )

  // Search results
  let searchHits = []
  if ((navSearch || '').trim().length > 1) {
    const q = (navSearch || '').trim().toLowerCase()
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

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {/* Stats — centred */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          [tot, 'Total Entries', 'var(--cc)'],
          [lk,  'Locked',        'var(--sl)'],
          [pv,  'Provisional',   'var(--sp)'],
          [op,  'Open',          'var(--so)'],
          [fl,  '🚩 Flags',      'var(--cfl)', () => goTo('flags')],
        ].map(([num, label, color, onClick], i) => (
          <div key={i} className="dash-card" onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default', minWidth: 100, textAlign: 'center' }}>
            <div className="dash-num" style={{ color }}>{num}</div>
            <div className="dash-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Search results — input is in the nav bar */}
      <div style={{ marginBottom: 14 }}>
        {searchHits.length > 0 && (
          <div style={{ marginTop: 6, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, maxHeight: 220, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.77em', color: 'var(--mut)', padding: '5px 10px', borderBottom: '1px solid var(--brd)' }}>
              {searchHits.length} result{searchHits.length !== 1 ? 's' : ''} — click to go to tab
            </div>
            {searchHits.slice(0, 30).map((h, i) => (
              <div key={h.id || i} onClick={() => { goTo(h.cat); setNavSearch && setNavSearch('') }}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px',
                  borderBottom: '1px solid var(--brd)', cursor: 'pointer',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)'}>
                <span style={{ fontSize: '0.92em' }}>{h.name}</span>
                <span style={{ fontSize: '0.77em', color: TAB_RAINBOW[h.cat] || 'var(--mut)' }}>{CATS[h.cat]?.i} {CATS[h.cat]?.l}</span>
              </div>
            ))}
            {searchHits.length > 30 && (
              <div style={{ fontSize: '0.77em', color: 'var(--mut)', padding: '5px 10px' }}>…and {searchHits.length - 30} more.</div>
            )}
          </div>
        )}
      </div>

      {/* ── Main body: left nav + 3 panels ── */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start', width: '100%', minWidth: 0 }}>

        {/* Left nav — thin, rainbow list */}
        <div style={{ flexShrink: 0, width: 160, minWidth: 0 }}>
          {TAB_LIST.map((k, i) => {
            const c = CATS[k]
            if (!c) return null
            const count = k === 'flags' ? fl : (data[k] || []).length
            const color = TAB_RAINBOW[k] || rc(i)
            return (
              <div key={k}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                  borderLeft: `3px solid ${color}`,
                  background: 'var(--card)', transition: '.12s' }}
                onClick={() => goTo(k)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--card)'}>
                <span style={{ fontSize: '0.85em', color: 'var(--tx)' }}>{c.i} {c.l}</span>
                <span style={{ fontSize: '0.92em', fontFamily: "'Cinzel',serif", color }}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* Recent */}
        <div style={{ flex: '1 1 0', minWidth: 120, maxWidth: 'calc(33.33% - 8px)', overflow: 'hidden' }}>
          {panelHead('⏱', 'Recent', 'var(--tx)', null)}
          {recent.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No recent entries</div>
            : recent.slice(0, 14).map((r, i) => panelRow(
                { ...r, detail: null },
                i, TAB_RAINBOW[r.cat] || 'var(--cc)',
                () => goTo(r.cat)
              ))
          }
        </div>

        {/* Questions */}
        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('?', 'Questions', 'var(--cq)', (data.questions || []).filter(q => q.status === 'open').length)}
          {questions.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No open questions</div>
            : questions.map((q, i) => panelRow(
                { ...q, detail: q.detail },
                i, 'var(--cq)',
                () => goTo('questions')
              ))
          }
        </div>

        {/* Flags */}
        <div style={{ flex: '1 1 0', minWidth: 140, overflow: 'hidden' }}>
          {panelHead('🚩', 'Flags', 'var(--cfl)', fl)}
          {flags.length === 0
            ? <div style={{ fontSize: '0.85em', color: 'var(--mut)', fontStyle: 'italic' }}>No flags</div>
            : flags.map((f, i) => panelRow(
                { ...f, detail: f.detail },
                i, 'var(--cfl)',
                () => goTo('flags')
              ))
          }
        </div>
      </div>

      {/* Hidden file input for header image */}
      <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeaderImg} />
    </div>
  )
}
