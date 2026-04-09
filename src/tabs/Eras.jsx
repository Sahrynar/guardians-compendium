import { useState } from 'react'
import { ERA_TIMELINE, ERA_SPANS, RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

export default function Eras() {
  const [openCats, setOpenCats] = useState(new Set(['SERIES ANCHORS','RELIGIOUS / CULTURAL']))

  const ERA_TABLE = [
    { cat: 'EARLY HUMANITY', rows: [
      { mn:'~300,000 BC', ev:'First Homo sapiens (Africa)',          my:301554, hc:-2568920, lc:2569240, mc:35394 },
      { mn:'~70,000 BC',  ev:'Toba supervolcano / human bottleneck', my:71554,  hc:-609320,  lc:609640,  mc:8399  },
      { mn:'~40,000 BC',  ev:'Cave art / behavioural modernity',     my:41554,  hc:-353720,  lc:354040,  mc:4877  },
      { mn:'~23,000 BC',  ev:'White Sands footprints (Americas)',    my:24554,  hc:-208880,  lc:209200,  mc:2882  },
    ]},
    { cat: 'CATACLYSMS & DISASTERS', rows: [
      { mn:'~10,800 BC', ev:'Younger Dryas impact',                     my:12354, hc:-104936, lc:105256, mc:1450 },
      { mn:'~9,600 BC',  ev:'End of Younger Dryas / Holocene',          my:11154, hc:-94712,  lc:95032,  mc:1309 },
      { mn:'~6,500 BC',  ev:'Doggerland final submergence',             my:8054,  hc:-68300,  lc:68620,  mc:945  },
      { mn:'~5,600 BC',  ev:'Black Sea Deluge hypothesis',              my:7154,  hc:-60612,  lc:60932,  mc:840  },
      { mn:'~1,600 BC',  ev:'Thera/Santorini eruption (Minoan collapse)',my:3154, hc:-26552,  lc:26872,  mc:370  },
    ]},
    { cat: 'MONUMENT BUILDING', rows: [
      { mn:'~3,000 BC', ev:'Stonehenge Phase 1',           my:4554, hc:-38480, lc:38800, mc:535 },
      { mn:'~2,560 BC', ev:'Great Pyramid of Giza',        my:4114, hc:-34731, lc:35051, mc:483 },
      { mn:'~2,550 BC', ev:'Stonehenge Phase 3 — sarsen',  my:4104, hc:-34646, lc:34966, mc:482 },
      { mn:'~1,600 BC', ev:'Stonehenge final phase',       my:3154, hc:-26552, lc:26872, mc:370 },
    ]},
    { cat: 'RELIGIOUS / CULTURAL', rows: [
      { mn:'~1 AD',  ev:'Birth of Jesus',                        my:1553, hc:-12912, lc:13232, mc:182 },
      { mn:'~33 AD', ev:'Crucifixion — Guardian sacrifice parallel', my:1521, hc:-12639, lc:12959, mc:179 },
    ]},
    { cat: 'SERIES ANCHORS', rows: [
      { mn:'~1516 AD', ev:'HC 1 — Lurlen falls, Rose flees', my:37.5, hc:1,   lc:320, mc:4.4 },
      { mn:'1554 AD',  ev:'HC 320 — Book 1 opens, Lila arrives', my:0, hc:320, lc:0,   mc:0   },
    ]},
  ]

  function toggleCat(cat) {
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  function fmt(n) {
    if (n === 0) return '0'
    if (typeof n !== 'number') return n
    if (n >= 10000) return '~' + Math.round(n).toLocaleString()
    if (n < 10) return '~' + n.toFixed(1)
    return '~' + Math.round(n).toLocaleString()
  }

  const lajenCore = new Set(['SERIES ANCHORS','RELIGIOUS / CULTURAL'])

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.31em', color: '#00b4d8' }}>⧖ Eras & Dating</div>
        <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>HC 320 = 1554 AD · 8.52 Lajen years = 1 Mnaerah year · All dates EXPLORATORY</div>
      </div>

      {/* Era spans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
        {ERA_SPANS.map(s => (
          <div key={s.name} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderTop: `3px solid ${s.col}`, borderRadius: 'var(--r)', padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: s.col }}>{s.name}</div>
            <div style={{ fontSize: '1.38em', fontWeight: 700, margin: '4px 0' }}>{s.ly}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--dim)' }}>{s.my}</div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em', color: '#00b4d8', marginBottom: 12 }}>Timeline</div>
        <div style={{ position: 'relative', paddingLeft: 90 }}>
          {ERA_TIMELINE.map((e, i) => {
            const isLast = i === ERA_TIMELINE.length - 1
            return (
              <div key={i} style={{ display: 'flex', minHeight: i===0?48:56, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -90, width: 80, textAlign: 'right', paddingRight: 12, fontSize: '0.77em' }}>
                  <div style={{ fontWeight: 600 }}>{e.ly}</div>
                  <div style={{ color: 'var(--mut)', fontSize: '0.69em' }}>{e.my}</div>
                </div>
                <div style={{ position: 'relative', width: 14, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.col, position: 'absolute', top: 3, left: 2, zIndex: 1 }} />
                  {!isLast && <div style={{ position: 'absolute', left: 6, top: 13, bottom: 0, width: 2, background: e.col, opacity: .4 }} />}
                </div>
                <div style={{ padding: '0 0 12px 8px', flex: 1 }}>
                  <div style={{ fontSize: '0.92em', fontWeight: 600, color: e.col }}>{e.label}</div>
                  <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 1 }}>{e.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em', color: '#00b4d8', marginBottom: 4 }}>Conversion Table</div>
        <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>Anchor: HC 320 = 1554 AD. Earth-history sections collapsed by default.</div>
        <div style={{ overflowX: 'auto' }}>
          {ERA_TABLE.map(cat => (
            <details key={cat.cat} open={lajenCore.has(cat.cat)} style={{ marginBottom: 4 }}>
              <summary
                style={{ fontSize: '0.77em', fontWeight: 700, color: '#00b4d8', padding: '6px 4px', cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '.06em', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {cat.cat} <span style={{ fontSize: '0.69em', color: 'var(--mut)', fontWeight: 400, textTransform: 'none' }}>({cat.rows.length} entries)</span>
              </summary>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77em', marginBottom: 4 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--brd)' }}>
                    {['Mnaerah','Event','MY before 1554','HC Date','Lajen clock','Mnaerah clock'].map(h => (
                      <th key={h} style={{ textAlign: h==='Event'?'left':'right', padding: '4px 6px', color: 'var(--dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.rows.map((r, i) => (
                    <tr key={i} style={{ background: i%2?'rgba(255,255,255,.015)':'transparent', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', color: 'var(--ct)', textAlign: 'right' }}>{r.mn}</td>
                      <td style={{ padding: '5px 6px', color: 'var(--tx)' }}>{r.ev}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--dim)' }}>{fmt(r.my)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--cc)', whiteSpace: 'nowrap' }}>{typeof r.hc==='number'&&r.hc<0?`HC ${fmt(r.hc)}`:`HC ${r.hc}`}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--cl)', whiteSpace: 'nowrap' }}>{fmt(r.lc)} LY</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: '#00b4d8', whiteSpace: 'nowrap' }}>{fmt(r.mc)} MY</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
