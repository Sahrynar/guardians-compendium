import { CATS, TAB_RAINBOW, rainbowAt } from '../constants'

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

  const TAB_LIST = [
    'characters','wardrobe','items','locations','timeline',
    'scenes','calendar','tools','canon','world','questions',
    'eras','spellings','map','wiki','notes','journal',
    'familytree','flags','manuscript','sessionlog','inventory'
  ]

  return (
    <div>
      {/* Stats bar — fluid grid, each cell has a min size so it wraps cleanly on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: 'var(--col-gap, 6px)',
        marginBottom: 14,
        marginTop: 8,
      }}>
        {[
          { val: tot,  label: 'Total Entries', color: TAB_RAINBOW.characters },
          { val: lk,   label: 'Locked',         color: '#7acc7a' },
          { val: pv,   label: 'Provisional',    color: '#ffcc00' },
          { val: op,   label: 'Open',            color: '#ff7040' },
          { val: fl,   label: '🚩 Flags',        color: TAB_RAINBOW.flags, onClick: () => goTo('flags') },
        ].map(({ val, label, color, onClick }) => (
          <div key={label}
            onClick={onClick}
            style={{
              background: 'var(--card)', border: '1px solid var(--brd)',
              borderRadius: 'var(--r)', padding: '8px', textAlign: 'center',
              cursor: onClick ? 'pointer' : 'default', transition: '.2s',
            }}
            onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = color }}
            onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--brd)' }}
          >
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          className="sx"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="Search everything…"
          onChange={() => {}}
        />
      </div>

      {/* Section list — fluid, wraps on mobile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {TAB_LIST.map((k, i) => {
          const c = CATS[k]
          if (!c) return null
          const count = k === 'flags' ? fl : (data[k] || []).length
          const rc = TAB_RAINBOW[k] || rainbowAt(i)
          return (
            <div
              key={k}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--brd)',
                borderLeft: `3px solid ${rc}`,
                borderRadius: 'var(--r)',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: '.15s',
              }}
              onClick={() => goTo(k)}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--chi)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)' }}
            >
              <span style={{ fontSize: 11, color: 'var(--tx)' }}>{c.i} {c.l}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: rc, fontWeight: 700 }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* Supabase warning */}
      {!db.hasSupabase && (
        <div style={{ fontSize: 10, color: '#ffaa33', marginTop: 14, padding: '6px 10px', background: 'rgba(255,170,51,.08)', borderRadius: 'var(--r)', border: '1px solid rgba(255,170,51,.2)' }}>
          ⚠ Running in local-only mode — add Supabase credentials for cloud sync
        </div>
      )}
    </div>
  )
}
