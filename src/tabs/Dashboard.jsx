import { useState, useRef } from 'react'
import { CATS, SL } from '../constants'

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

  const rainbow = ['#ff69b4','#ff6b6b','#e63946','#f4442e','#ff8c00','#ffb700','#ffd600','#aacc00','#38b000','#0fb5a0','#00b4d8','#4cc9f0','#3a86ff','#4361ee','#7b2d8b','#9d4edd','#c77dff','#ff48c4']

  // Recent entries across all categories
  const recent = []
  Object.entries(data).forEach(([cat, entries]) => {
    if (!Array.isArray(entries) || !CATS[cat]) return
    entries.forEach(e => {
      const ts = e.updated_at || e.updated || e.created
      if (ts) recent.push({ cat, name: e.name || e.title || e.display_name || e.word || '(unnamed)', ts, id: e.id, status: e.status })
    })
  })
  recent.sort((a, b) => new Date(b.ts) - new Date(a.ts))

  const questions = (data.questions || []).filter(q => q.status === 'open').slice(0, 8)
  const flags = (data.flags || []).slice(0, 8)
  const canonLocked = (data.canon || []).filter(c => c.status === 'locked').slice(0, 8)

  const TAB_LIST = [
    'dashboard','wiki','glossary','characters','familytree','world','locations','map',
    'manuscript','scenes','timeline','eras','calendar',
    'inventory','wardrobe','items','flags','questions','canon','spellings',
    'notes','journal','tools','sessionlog'
  ]

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

  return (
    <div>
      {/* Header — just the image upload, title is in nav bar */}
      <div style={{ textAlign: 'center', padding: '10px 0 8px' }}>
        {headerImg
          ? <div style={{ position: 'relative', marginBottom: 8 }}>
              <img src={headerImg} alt="header"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
              <button onClick={() => { setHeaderImg(''); db.saveSetting('dashboard_header_image', '') }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)',
                  border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}>
                ✕ Remove
              </button>
            </div>
          : null
        }
        <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeaderImg} />
        <button onClick={() => imgRef.current?.click()}
          style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: 'none',
            border: '1px solid var(--brd)', color: 'var(--mut)', cursor: 'pointer' }}>
          📷 {headerImg ? 'Change header image' : 'Upload header image'}
        </button>
        {!db.hasSupabase && (
          <div style={{ fontSize: 10, color: 'var(--sp)', marginTop: 6 }}>
            ⚠ Running in local-only mode — add Supabase credentials for cloud sync
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="dash-grid">
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
        {search.trim().length > 1 && (() => {
          const q = search.trim().toLowerCase()
          const hits = []
          Object.entries(data).forEach(([cat, entries]) => {
            if (!Array.isArray(entries) || !CATS[cat]) return
            entries.forEach(entry => {
              const name = entry.name || entry.title || entry.display_name || entry.word || ''
              if (name.toLowerCase().includes(q) || JSON.stringify(entry).toLowerCase().includes(q)) {
                hits.push({ cat, name: name || '(unnamed)', id: entry.id })
              }
            })
          })
          if (!hits.length) return (
            <div style={{ fontSize: 11, color: 'var(--mut)', padding: '6px 4px' }}>No results for "{search}"</div>
          )
          return (
            <div style={{ marginTop: 6, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: 'var(--mut)', padding: '5px 10px', borderBottom: '1px solid var(--brd)' }}>
                {hits.length} result{hits.length !== 1 ? 's' : ''} — click to go to tab
              </div>
              {hits.slice(0, 30).map((h, i) => (
                <div key={h.id || i} onClick={() => { goTo(h.cat); setSearch('') }}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px',
                    borderBottom: '1px solid var(--brd)', cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)'}>
                  <span style={{ fontSize: 12, color: 'var(--tx)' }}>{h.name}</span>
                  <span style={{ fontSize: 10, color: CATS[h.cat]?.c || 'var(--mut)' }}>{CATS[h.cat]?.i} {CATS[h.cat]?.l}</span>
                </div>
              ))}
              {hits.length > 30 && (
                <div style={{ fontSize: 10, color: 'var(--mut)', padding: '5px 10px' }}>
                  …and {hits.length - 30} more. Narrow your search.
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Four-column content area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Recent */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx)', textTransform: 'uppercase',
            letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
            display: 'flex', justifyContent: 'space-between' }}>
            <span>⏱ Recent</span>
          </div>
          {recent.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>No recent entries</div>
            : recent.slice(0, 12).map((r, i) => (
              <div key={r.id || i} onClick={() => goTo(r.cat)}
                style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                  background: i % 2 === 0 ? 'var(--card)' : 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
                <div style={{ fontSize: 12, color: 'var(--tx)', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                <div style={{ fontSize: 9, color: CATS[r.cat]?.c || 'var(--mut)' }}>
                  {CATS[r.cat]?.i} {CATS[r.cat]?.l}
                </div>
              </div>
            ))
          }
        </div>

        {/* Open Questions */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cq)', textTransform: 'uppercase',
            letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
            display: 'flex', justifyContent: 'space-between' }}>
            <span>? Questions</span>
            <span style={{ color: 'var(--mut)' }}>+{(data.questions || []).filter(q => q.status === 'open').length}</span>
          </div>
          {questions.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>No open questions</div>
            : questions.map((q, i) => (
              <div key={q.id || i} onClick={() => goTo('questions')}
                style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                  background: i % 2 === 0 ? 'var(--card)' : 'transparent',
                  borderLeft: '2px solid var(--cq)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
                <div style={{ fontSize: 11, color: 'var(--tx)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                {q.detail && <div style={{ fontSize: 9, color: 'var(--mut)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.detail}</div>}
              </div>
            ))
          }
        </div>

        {/* Flags */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cfl)', textTransform: 'uppercase',
            letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
            display: 'flex', justifyContent: 'space-between' }}>
            <span>🚩 Flags</span>
            <span style={{ color: 'var(--mut)' }}>+{fl}</span>
          </div>
          {flags.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>No flags</div>
            : flags.map((f, i) => (
              <div key={f.id || i} onClick={() => goTo('flags')}
                style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                  background: i % 2 === 0 ? 'var(--card)' : 'transparent',
                  borderLeft: '2px solid var(--cfl)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
                <div style={{ fontSize: 11, color: 'var(--tx)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                {f.detail && <div style={{ fontSize: 9, color: 'var(--mut)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</div>}
              </div>
            ))
          }
        </div>
        {/* Canon Locks */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ccn)', textTransform: 'uppercase',
            letterSpacing: '.08em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)',
            display: 'flex', justifyContent: 'space-between' }}>
            <span>✦ Canon</span>
            <span style={{ color: 'var(--mut)' }}>{(data.canon || []).filter(c => c.status === 'locked').length} locked</span>
          </div>
          {canonLocked.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>No locked canon yet</div>
            : canonLocked.map((c, i) => (
              <div key={c.id || i} onClick={() => goTo('canon')}
                style={{ padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                  background: i % 2 === 0 ? 'var(--card)' : 'transparent',
                  borderLeft: '2px solid var(--ccn)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'transparent'}>
                <div style={{ fontSize: 11, color: 'var(--tx)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                {c.detail && <div style={{ fontSize: 9, color: 'var(--mut)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.detail}</div>}
              </div>
            ))
          }
        </div>
      </div>

      {/* Tab list — ordered by TAB_ORDER */}
      <div style={{ marginTop: 4 }}>
        {TAB_LIST.filter(k => CATS[k] && k !== 'dashboard').map((k, i) => {
          const c = CATS[k]
          const count = k === 'flags' ? fl : (data[k] || []).length
          const rc = rainbow[i % rainbow.length]
          return (
            <div key={k} className="dash-card"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                padding: '6px 10px', borderLeft: `3px solid ${rc}`, marginBottom: 4, cursor: 'pointer' }}
              onClick={() => goTo(k)}>
              <span style={{ fontSize: 11 }}>{c.i} {c.l}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: rc }}>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
