import { useState, useMemo } from 'react'
import { CATS, SL } from '../constants'

const rainbow = [
  'var(--cc)','var(--cwr)','var(--ci)','var(--cl)',
  'var(--csc)','var(--cca)','var(--ccn)','var(--cw)',
  'var(--cq)','var(--csp)','var(--cfl)','var(--cd)',
]

export default function Dashboard({ db, goTo }) {
  const { db: data } = db
  const [search, setSearch] = useState('')
  const [showRecent, setShowRecent] = useState(true)
  const [showFlags, setShowFlags] = useState(true)
  const [showQuestions, setShowQuestions] = useState(true)

  // ── Stats ──────────────────────────────────────────────────
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

  // ── Global search ──────────────────────────────────────────
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

  // ── Recent additions (last 8 across all cats) ──────────────
  const recentEntries = useMemo(() => {
    const all = []
    Object.entries(CATS).forEach(([cat, cfg]) => {
      if (cat === 'dashboard' || cat === 'flags') return
      ;(data[cat] || []).forEach(e => {
        if (e.created || e.updated) all.push({ cat, cfg, e,
          ts: e.updated || e.created || '' })
      })
    })
    return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8)
  }, [data])

  // ── Open questions ─────────────────────────────────────────
  const openQuestions = useMemo(() => {
    return (data.questions || []).filter(q => q.status !== 'locked').slice(0, 6)
  }, [data])

  // ── Active flags ───────────────────────────────────────────
  const activeFlags = useMemo(() => {
    return (data.flags || []).filter(f => !f.resolved).slice(0, 6)
  }, [data])

  const isSearching = search.trim().length >= 2

  return (
    <div style={{ padding:'0 4px' }}>

      {/* ── Stats row ── */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {[
          { label:'Total', val:tot, color:'var(--cc)' },
          { label:'Locked', val:lk, color:'var(--sl)' },
          { label:'Provisional', val:pv, color:'var(--sp)' },
          { label:'Open', val:op, color:'var(--so)' },
          { label:'🚩 Flags', val:fl, color:'var(--cfl)', onClick:() => goTo('flags') },
        ].map(s => (
          <div key={s.label} className="dash-card"
            onClick={s.onClick} style={{ cursor: s.onClick ? 'pointer':undefined }}>
            <div className="dash-num" style={{ color:s.color }}>{s.val}</div>
            <div className="dash-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Global search ── */}
      <div style={{ marginBottom:14 }}>
        <input className="sx" style={{ width:'100%' }}
          placeholder="Search everything…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── Search results ── */}
      {isSearching && (
        <div style={{ marginBottom:14 }}>
          {searchResults.length === 0
            ? <div style={{ fontSize:11,color:'var(--mut)',padding:'6px 0' }}>No results.</div>
            : <>
                <div style={{ fontSize:10,color:'var(--mut)',marginBottom:6 }}>
                  {searchResults.length} result{searchResults.length!==1?'s':''}
                  {searchResults.length===50?' (first 50)':''}
                </div>
                {searchResults.map(({ cat, cfg, e }, i) => (
                  <div key={`${cat}-${e.id}-${i}`} className="dash-card"
                    style={{ textAlign:'left', display:'flex', flexDirection:'column',
                      padding:'6px 10px', borderLeft:`3px solid ${cfg.c}`,
                      marginBottom:4, cursor:'pointer' }}
                    onClick={() => goTo(cat)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{e.display_name||e.name||'—'}</span>
                      <span style={{ fontSize:9, color:cfg.c, textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {cfg.i} {cfg.l}
                      </span>
                    </div>
                    {(e.detail||e.description||e.summary||e.notes) && (
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:2, lineHeight:1.4 }}>
                        {(e.detail||e.description||e.summary||e.notes||'').slice(0,120)}
                        {(e.detail||e.description||e.summary||e.notes||'').length>120?'…':''}
                      </div>
                    )}
                  </div>
                ))}
              </>
          }
        </div>
      )}

      {/* ── Hub sections — hide while searching ── */}
      {!isSearching && (<>

        {/* Needs Attention */}
        {(activeFlags.length > 0 || openQuestions.length > 0) && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--sp)',
              textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
              ⚠ Needs Attention
            </div>

            {/* Flags */}
            {activeFlags.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:10, color:'var(--cfl)', fontWeight:600 }}>
                    🚩 Active Flags
                  </span>
                  <button style={{ background:'none', border:'none', cursor:'pointer',
                    fontSize:10, color:'var(--mut)' }}
                    onClick={() => setShowFlags(p=>!p)}>
                    {showFlags ? '▾' : '▸'}
                  </button>
                </div>
                {showFlags && activeFlags.map(f => (
                  <div key={f.id} className="dash-card"
                    style={{ textAlign:'left', padding:'5px 10px',
                      borderLeft:'3px solid var(--cfl)', marginBottom:3,
                      cursor:'pointer' }}
                    onClick={() => goTo('flags')}>
                    <div style={{ fontSize:11, fontWeight:600 }}>{f.name}</div>
                    {f.detail && (
                      <div style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>
                        {f.detail.slice(0,100)}{f.detail.length>100?'…':''}
                      </div>
                    )}
                  </div>
                ))}
                {(data.flags||[]).length > 6 && (
                  <div style={{ fontSize:10, color:'var(--mut)', paddingLeft:10, marginTop:2,
                    cursor:'pointer' }} onClick={() => goTo('flags')}>
                    +{(data.flags||[]).length - 6} more →
                  </div>
                )}
              </div>
            )}

            {/* Open Questions */}
            {openQuestions.length > 0 && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:10, color:'var(--cq)', fontWeight:600 }}>
                    ❓ Open Questions
                  </span>
                  <button style={{ background:'none', border:'none', cursor:'pointer',
                    fontSize:10, color:'var(--mut)' }}
                    onClick={() => setShowQuestions(p=>!p)}>
                    {showQuestions ? '▾' : '▸'}
                  </button>
                </div>
                {showQuestions && openQuestions.map(q => (
                  <div key={q.id} className="dash-card"
                    style={{ textAlign:'left', padding:'5px 10px',
                      borderLeft:'3px solid var(--cq)', marginBottom:3,
                      cursor:'pointer' }}
                    onClick={() => goTo('questions')}>
                    <div style={{ fontSize:11 }}>{q.name}</div>
                  </div>
                ))}
                {(data.questions||[]).filter(q=>q.status!=='locked').length > 6 && (
                  <div style={{ fontSize:10, color:'var(--mut)', paddingLeft:10, marginTop:2,
                    cursor:'pointer' }} onClick={() => goTo('questions')}>
                    +{(data.questions||[]).filter(q=>q.status!=='locked').length - 6} more →
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Additions */}
        {recentEntries.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--cl)',
                textTransform:'uppercase', letterSpacing:'.06em' }}>
                🕐 Recently Added / Updated
              </div>
              <button style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:10, color:'var(--mut)' }}
                onClick={() => setShowRecent(p=>!p)}>
                {showRecent ? '▾' : '▸'}
              </button>
            </div>
            {showRecent && recentEntries.map(({ cat, cfg, e }, i) => (
              <div key={`${cat}-${e.id}-${i}`} className="dash-card"
                style={{ textAlign:'left', display:'flex',
                  justifyContent:'space-between', alignItems:'center',
                  padding:'5px 10px', borderLeft:`3px solid ${cfg.c}`,
                  marginBottom:3, cursor:'pointer' }}
                onClick={() => goTo(cat)}>
                <span style={{ fontSize:11 }}>{e.display_name||e.name||'—'}</span>
                <span style={{ fontSize:9, color:cfg.c, textTransform:'uppercase',
                  letterSpacing:'.04em', flexShrink:0, marginLeft:8 }}>
                  {cfg.i} {cfg.l}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Category nav */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--mut)',
            textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
            All Sections
          </div>
          {Object.entries(CATS).filter(([k]) => k !== 'dashboard').map(([k, c], i) => {
            const count = k === 'flags' ? fl : (data[k]||[]).length
            const rc = rainbow[i % rainbow.length]
            const locked = k !== 'flags' ? (data[k]||[]).filter(e=>e.status==='locked').length : 0
            const provisional = k !== 'flags' ? (data[k]||[]).filter(e=>e.status==='provisional').length : 0
            return (
              <div key={k} className="dash-card"
                style={{ textAlign:'left', padding:'6px 10px',
                  borderLeft:`3px solid ${rc}`, marginBottom:3,
                  cursor:'pointer', display:'flex',
                  justifyContent:'space-between', alignItems:'center' }}
                onClick={() => goTo(k)}>
                <span style={{ fontSize:11 }}>{c.i} {c.l}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {locked > 0 && (
                    <span style={{ fontSize:9, color:'var(--sl)' }}>{locked}L</span>
                  )}
                  {provisional > 0 && (
                    <span style={{ fontSize:9, color:'var(--sp)' }}>{provisional}P</span>
                  )}
                  <span style={{ fontFamily:"'Cinzel',serif",
                    fontSize:13, color:rc }}>{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </>)}
    </div>
  )
}
