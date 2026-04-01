import { useState } from 'react'
import { CATS, SL } from '../constants'

export default function Dashboard({ db, goTo }) {
  const { db: data } = db
  const [search, setSearch] = useState('')
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

  const rainbow = ['#ff69b4','#ff3366','#ff4444','#ff6633','#ff8800','#ffaa00','#ffcc00','#aadd00','#44cc44','#00cc88','#00cccc','#2299dd','#3366ff','#5544ff','#7733ee','#9933cc','#bb33aa','#dd44aa']

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0 14px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: 'var(--mut)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 6 }}>The Guardians of Lajen</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 700, letterSpacing: '.08em',
          background: 'linear-gradient(90deg,#ff69b4,#ff2222,#ff8800,#ffdd00,#44cc44,#00ccaa,#3399ff,#6644ff,#aa33ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 2 }}>
          Worldbuilding Compendium
        </div>
        {!db.hasSupabase && (
          <div style={{ fontSize: 10, color: 'var(--sp)', marginTop: 4 }}>
            ⚠ Running in local-only mode — add Supabase credentials for cloud sync
          </div>
        )}
      </div>

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

      <div style={{ marginBottom: 12 }}>
        <input
          className="sx"
          style={{ width: '100%' }}
          placeholder="Search everything…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search.trim().length > 1 && (() => {
          const q = search.trim().toLowerCase()
          const hits = []
          Object.entries(data).forEach(([cat, entries]) => {
            if (!Array.isArray(entries) || !CATS[cat]) return
            entries.forEach(entry => {
              const text = JSON.stringify(entry).toLowerCase()
              if (text.includes(q)) {
                const name = entry.name || entry.title || entry.display_name || entry.word || '(unnamed)'
                hits.push({ cat, name, id: entry.id })
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
                <div key={h.id || i}
                  onClick={() => { goTo(h.cat); setSearch('') }}
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

      <div style={{ marginTop: 12 }}>
        {Object.entries(CATS).filter(([k]) => k !== 'dashboard').map(([k, c], i) => {
          const count = k === 'flags' ? fl : (data[k] || []).length
          const rc = rainbow[i % rainbow.length]
          return (
            <div
              key={k}
              className="dash-card"
              style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderLeft: `3px solid ${rc}`, marginBottom: 4 }}
              onClick={() => goTo(k)}
            >
              <span style={{ fontSize: 11 }}>{c.i} {c.l}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: rc }}>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
