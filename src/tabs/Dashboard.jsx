import { useState, useMemo } from 'react'
import { CATS, SL } from '../constants'

export default function Dashboard({ db, goTo }) {
  const { db: data } = db
  const [search, setSearch] = useState('')

  let tot = 0, lk = 0, pv = 0, op = 0
  const fl = (data.flags || []).filter(f => !f.resolved).length
  Object.keys(CATS).forEach(c => {
    if (c === 'flags' || c === 'dashboard' || !data[c]) return
    tot += data[c].length
    data[c].forEach(e => {
      if (e.status === 'locked') lk++
      if (e.status === 'provisional') pv++
      if (e.status === 'open') op++
    })
  })

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || q.length < 2) return []
    const results = []
    Object.entries(CATS).forEach(([cat, cfg]) => {
      if (cat === 'dashboard') return
      ;(data[cat] || []).forEach(e => {
        const text = [e.name, e.display_name, e.detail, e.notes,
          e.aliases, e.description, e.summary, e.content, e.working]
          .filter(Boolean).join(' ').toLowerCase()
        if (text.includes(q)) results.push({ cat, cfg, e })
      })
    })
    return results.slice(0, 50)
  }, [search, data])

  const recentEntries = useMemo(() => {
    const all = []
    Object.entries(CATS).forEach(([cat, cfg]) => {
      if (cat === 'dashboard' || cat === 'flags') return
      ;(data[cat] || []).forEach(e => {
        if (e.created || e.updated) all.push({ cat, cfg, e, ts: e.updated || e.created || '' })
      })
    })
    return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8)
  }, [data])

  const openQuestions = useMemo(() =>
    (data.questions || []).filter(q => q.status !== 'locked').slice(0, 6)
  , [data])

  const activeFlags = useMemo(() =>
    (data.flags || []).filter(f => !f.resolved).slice(0, 6)
  , [data])

  const isSearching = search.trim().length >= 2
  const totalFlags = (data.flags || []).filter(f => !f.resolved).length
  const totalQ = (data.questions || []).filter(q => q.status !== 'locked').length
  const navEntries = Object.entries(CATS).filter(([k]) => k !== 'dashboard')

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '100%' }}>
      {/* LEFT NAV */}
      <div style={{ width: 130, flexShrink: 0, borderRight: '1px solid var(--brd)', paddingRight: 8, marginRight: 12, paddingTop: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Sections</div>
        {navEntries.map(([k, c]) => {
          const count = k === 'flags' ? (data.flags || []).filter(f => !f.resolved).length : (data[k] || []).length
          return (
            <div key={k} onClick={() => goTo(k)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, borderLeft: `3px solid ${c.c}` }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 10, color: 'var(--tx)' }}>{c.i} {c.l}</span>
              <span style={{ fontSize: 11, fontFamily: "'Cinzel',serif", color: c.c, flexShrink: 0 }}>{count || ''}</span>
            </div>
          )
        })}
      </div>

      {/* RIGHT HUB */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            { label: 'Total', val: tot, color: 'var(--cc)' },
            { label: 'Locked', val: lk, color: 'var(--sl)' },
            { label: 'Provisional', val: pv, color: 'var(--sp)' },
            { label: 'Open', val: op, color: 'var(--so)' },
            { label: '🚩 Flags', val: fl, color: 'var(--cfl)', onClick: () => goTo('flags') },
          ].map(s => (
            <div key={s.label} className="dash-card" onClick={s.onClick}
              style={{ cursor: s.onClick ? 'pointer' : undefined, padding: '5px 10px', flex: '1 1 55px' }}>
              <div className="dash-num" style={{ color: s.color, fontSize: 18 }}>{s.val}</div>
              <div className="dash-label" style={{ fontSize: 9 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 10 }}>
          <input className="sx" style={{ width: '100%' }} placeholder="Search everything…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Search results */}
        {isSearching && (
          <div>
            {searchResults.length === 0
              ? <div style={{ fontSize: 11, color: 'var(--mut)' }}>No results.</div>
              : <>
                  <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 6 }}>
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{searchResults.length === 50 ? ' (first 50)' : ''}
                  </div>
                  {searchResults.map(({ cat, cfg, e }, i) => (
                    <div key={`${cat}-${e.id}-${i}`} className="dash-card"
                      style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', padding: '5px 10px', borderLeft: `3px solid ${cfg.c}`, marginBottom: 3, cursor: 'pointer' }}
                      onClick={() => goTo(cat)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{e.display_name || e.name || '—'}</span>
                        <span style={{ fontSize: 9, color: cfg.c, textTransform: 'uppercase' }}>{cfg.i} {cfg.l}</span>
                      </div>
                      {(e.detail || e.description || e.summary || e.notes) && (
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                          {(e.detail || e.description || e.summary || e.notes || '').slice(0, 100)}…
                        </div>
                      )}
                    </div>
                  ))}
                </>
            }
          </div>
        )}

        {/* Three panels */}
        {!isSearching && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {/* Recent */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cl)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>🕐 Recent</div>
              {recentEntries.length === 0 && <div style={{ fontSize: 10, color: 'var(--mut)' }}>Nothing yet.</div>}
              {recentEntries.map(({ cat, cfg, e }, i) => (
                <div key={`r-${cat}-${e.id}-${i}`}
                  style={{ padding: '4px 8px', borderLeft: `2px solid ${cfg.c}`, marginBottom: 3, cursor: 'pointer', borderRadius: '0 4px 4px 0', background: 'var(--card)' }}
                  onClick={() => goTo(cat)}>
                  <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{(e.display_name || e.name || '—').slice(0, 40)}</div>
                  <div style={{ fontSize: 9, color: cfg.c }}>{cfg.i} {cfg.l}</div>
                </div>
              ))}
            </div>

            {/* Questions */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cq)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>❓ Questions</span>
                {totalQ > 6 && <span style={{ fontSize: 9, color: 'var(--mut)', fontWeight: 400, cursor: 'pointer' }} onClick={() => goTo('questions')}>+{totalQ - 6}</span>}
              </div>
              {openQuestions.length === 0 && <div style={{ fontSize: 10, color: 'var(--mut)' }}>None open.</div>}
              {openQuestions.map(q => (
                <div key={q.id}
                  style={{ padding: '4px 8px', borderLeft: '2px solid var(--cq)', marginBottom: 3, cursor: 'pointer', borderRadius: '0 4px 4px 0', background: 'var(--card)' }}
                  onClick={() => goTo('questions')}>
                  <div style={{ fontSize: 10, lineHeight: 1.3 }}>{(q.name || '').slice(0, 65)}{(q.name || '').length > 65 ? '…' : ''}</div>
                </div>
              ))}
            </div>

            {/* Flags */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cfl)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>🚩 Flags</span>
                {totalFlags > 6 && <span style={{ fontSize: 9, color: 'var(--mut)', fontWeight: 400, cursor: 'pointer' }} onClick={() => goTo('flags')}>+{totalFlags - 6}</span>}
              </div>
              {activeFlags.length === 0 && <div style={{ fontSize: 10, color: 'var(--mut)' }}>No active flags.</div>}
              {activeFlags.map(f => (
                <div key={f.id}
                  style={{ padding: '4px 8px', borderLeft: '2px solid var(--cfl)', marginBottom: 3, cursor: 'pointer', borderRadius: '0 4px 4px 0', background: 'var(--card)' }}
                  onClick={() => goTo('flags')}>
                  <div style={{ fontSize: 10, lineHeight: 1.3 }}>{(f.name || '').slice(0, 65)}{(f.name || '').length > 65 ? '…' : ''}</div>
                  {f.category && <div style={{ fontSize: 9, color: 'var(--mut)' }}>{f.category}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
