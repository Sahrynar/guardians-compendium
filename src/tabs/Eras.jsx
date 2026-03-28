import { useState } from 'react'
import { ERA_TIMELINE, ERA_SPANS, RATIO, LDAYS, MDAYS, LDPM, MONTHS } from '../constants'

// ── Editable era data (local state, not in main DB — these are reference data) ──
const DEFAULT_TIMELINE = ERA_TIMELINE
const DEFAULT_SPANS = ERA_SPANS

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

function fmt(n) {
  if (n === 0) return '0'
  if (typeof n !== 'number') return n
  if (n >= 10000) return '~' + Math.round(n).toLocaleString()
  if (n < 10) return '~' + n.toFixed(1)
  return '~' + Math.round(n).toLocaleString()
}

const lajenCore = new Set(['SERIES ANCHORS','RELIGIOUS / CULTURAL'])

// ── Simple edit modal ─────────────────────────────────────────────
function EditModal({ item, type, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }
  const inp = (k, label, num) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 10, color: 'var(--mut)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={num ? 'number' : 'text'} value={form[k] ?? ''} onChange={e => set(k, num ? parseFloat(e.target.value) : e.target.value)}
        style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', boxSizing: 'border-box' }} />
    </div>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: 'var(--cca)', marginBottom: 14 }}>
          ✎ Edit {type === 'timeline' ? 'Timeline Entry' : 'Era Span'}
        </div>
        {type === 'timeline' ? (
          <>
            {inp('label', 'Event Label')}
            {inp('ly', 'Lajen Date (HC)')}
            {inp('my', 'Mnaerah Date')}
            {inp('desc', 'Description')}
          </>
        ) : (
          <>
            {inp('name', 'Era Name')}
            {inp('ly', 'Lajen Years')}
            {inp('my', 'Mnaerah Years')}
            {inp('desc', 'Description')}
          </>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--cca)', color: '#000' }} onClick={() => { onSave(form); onClose() }}>Save</button>
        </div>
        <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 10 }}>
          Note: These edits apply to this session only. Persistent era editing requires a future build.
        </div>
      </div>
    </div>
  )
}

export default function Eras() {
  const [timeline, setTimeline] = useState(DEFAULT_TIMELINE)
  const [spans, setSpans] = useState(DEFAULT_SPANS)
  const [editItem, setEditItem] = useState(null)
  const [editType, setEditType] = useState(null)
  const [editIdx, setEditIdx] = useState(null)

  function handleSaveTimeline(form) {
    setTimeline(prev => prev.map((e, i) => i === editIdx ? { ...e, ...form } : e))
  }
  function handleSaveSpan(form) {
    setSpans(prev => prev.map((s, i) => i === editIdx ? { ...s, ...form } : s))
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 17, color: 'var(--cca)' }}>⧖ Eras & Dating</div>
        <div style={{ fontSize: 10, color: 'var(--mut)' }}>HC 320 = 1554 AD · 8.52 Lajen years = 1 Mnaerah year · All dates EXPLORATORY</div>
      </div>

      {/* Era spans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
        {spans.map((s, i) => (
          <div key={s.name} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderTop: `3px solid ${s.col}`, borderRadius: 'var(--r)', padding: 10, textAlign: 'center', position: 'relative' }}>
            <button onClick={() => { setEditItem(s); setEditType('span'); setEditIdx(i) }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: 'var(--mut)', fontSize: 12, cursor: 'pointer', padding: '2px 5px', borderRadius: 4 }}
              title="Edit">✎</button>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: s.col }}>{s.name}</div>
            <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{s.ly}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>{s.my}</div>
            <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--cca)', marginBottom: 12 }}>Timeline</div>
        <div style={{ position: 'relative', paddingLeft: 90 }}>
          {timeline.map((e, i) => {
            const isLast = i === timeline.length - 1
            return (
              <div key={i} style={{ display: 'flex', minHeight: i===0?48:56, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -90, width: 80, textAlign: 'right', paddingRight: 12, fontSize: 10 }}>
                  <div style={{ fontWeight: 600 }}>{e.ly}</div>
                  <div style={{ color: 'var(--mut)', fontSize: 9 }}>{e.my}</div>
                </div>
                <div style={{ position: 'relative', width: 14, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.col, position: 'absolute', top: 3, left: 2, zIndex: 1 }} />
                  {!isLast && <div style={{ position: 'absolute', left: 6, top: 13, bottom: 0, width: 2, background: e.col, opacity: .4 }} />}
                </div>
                <div style={{ padding: '0 0 12px 8px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: e.col }}>{e.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{e.desc}</div>
                  </div>
                  <button onClick={() => { setEditItem(e); setEditType('timeline'); setEditIdx(i) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mut)', fontSize: 11, cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}>✎</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--cca)', marginBottom: 4 }}>Conversion Table</div>
        <div style={{ fontSize: 9, color: 'var(--mut)', marginBottom: 8 }}>Anchor: HC 320 = 1554 AD. Earth-history sections collapsed by default.</div>
        <div style={{ overflowX: 'auto' }}>
          {ERA_TABLE.map(cat => (
            <details key={cat.cat} open={lajenCore.has(cat.cat)} style={{ marginBottom: 4 }}>
              <summary style={{ fontSize: 10, fontWeight: 700, color: 'var(--cca)', padding: '6px 4px', cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '.06em', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                {cat.cat} <span style={{ fontSize: 9, color: 'var(--mut)', fontWeight: 400, textTransform: 'none' }}>({cat.rows.length} entries)</span>
              </summary>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 4 }}>
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
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--cca)', whiteSpace: 'nowrap' }}>{fmt(r.mc)} MY</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (
        <EditModal
          item={editItem}
          type={editType}
          onSave={editType === 'timeline' ? handleSaveTimeline : handleSaveSpan}
          onClose={() => { setEditItem(null); setEditType(null); setEditIdx(null) }}
        />
      )}
    </div>
  )
}
