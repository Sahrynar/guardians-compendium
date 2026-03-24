import { CATS, SL } from '../constants'

export default function Dashboard({ db, goTo }) {
  const { db: data } = db
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
      <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 17 }}>Worldbuilding Compendium</div>
        <div style={{ fontSize: 10, color: 'var(--mut)' }}>The Guardians of Lajen</div>
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
          onChange={e => {
            // Global search — could expand to show results
          }}
        />
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
