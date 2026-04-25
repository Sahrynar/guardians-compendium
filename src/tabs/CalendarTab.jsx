import { useState, useEffect } from 'react'
import Modal from '../components/common/Modal'
import { MONTHS, WEEKDAYS, SEASON_TAG_COLORS, TAB_RAINBOW, ERA_TIMELINE, ERA_SPANS, uid } from '../constants'

const MC = ['#00ffcc','#66cc99','#ff3366','#f4c430','#cc6622','#990000','#4477cc','#7799cc','#a9c0d3','#7fff00','#bb77cc','#9400d3']
const CAL_COLOR = TAB_RAINBOW['calendar'] || '#aaaaaa'
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
    { mn:'~1,600 BC',  ev:'Thera/Santorini eruption',                 my:3154,  hc:-26552,  lc:26872,  mc:370  },
  ]},
  { cat: 'MONUMENT BUILDING', rows: [
    { mn:'~3,000 BC', ev:'Stonehenge Phase 1',           my:4554, hc:-38480, lc:38800, mc:535 },
    { mn:'~2,560 BC', ev:'Great Pyramid of Giza',        my:4114, hc:-34731, lc:35051, mc:483 },
    { mn:'~2,550 BC', ev:'Stonehenge Phase 3 — sarsen',  my:4104, hc:-34646, lc:34966, mc:482 },
    { mn:'~1,600 BC', ev:'Stonehenge final phase',       my:3154, hc:-26552, lc:26872, mc:370 },
  ]},
  { cat: 'RELIGIOUS / CULTURAL', rows: [
    { mn:'~1 AD',  ev:'Birth of Jesus',                           my:1553, hc:-12912, lc:13232, mc:182 },
    { mn:'~33 AD', ev:'Crucifixion — Guardian sacrifice parallel', my:1521, hc:-12639, lc:12959, mc:179 },
  ]},
  { cat: 'SERIES ANCHORS', rows: [
    { mn:'~1516 AD', ev:'HC 1 — Lurlen falls, Rose flees',       my:37.5, hc:1,   lc:320, mc:4.4 },
    { mn:'1554 AD',  ev:'HC 320 — Book 1 opens, Lila arrives',   my:0,    hc:320, lc:0,   mc:0   },
  ]},
]
const lajenCore = new Set(['SERIES ANCHORS','RELIGIOUS / CULTURAL'])

function fmt(n) {
  if (n === 0) return '0'
  if (typeof n !== 'number') return String(n)
  if (n >= 10000) return '~' + Math.round(n).toLocaleString()
  if (n < 10) return '~' + n.toFixed(1)
  return '~' + Math.round(n).toLocaleString()
}

function moonSVG(day) {
  const r = 5
  if (day === 1 || day === 30) return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#ccc"/></svg>`
  if (day <= 8) {
    const f = 1 - (day-1)/7
    return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/><circle cx="6" cy="6" r="${r}" fill="#aaa" clip-path="inset(0 ${f*10}px 0 0)"/></svg>`
  }
  if (day <= 15) return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/></svg>`
  if (day <= 22) {
    const f = (day-15)/7
    return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/><circle cx="6" cy="6" r="${r}" fill="#aaa" clip-path="inset(0 0 0 ${(1-f)*10}px)"/></svg>`
  }
  return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#aaa"/></svg>`
}

// ── Eras edit modal ───────────────────────────────────────────────
function EraEditModal({ item, type, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }
  const inp = (k, label, num) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: '0.77em', color: 'var(--mut)', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={num ? 'number' : 'text'} value={form[k] ?? ''}
        onChange={e => set(k, num ? parseFloat(e.target.value) : e.target.value)}
        style={{ width: '100%', fontSize: '0.85em', padding: '5px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', boxSizing: 'border-box' }} />
    </div>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: CAL_COLOR, marginBottom: 14 }}>
          ✎ Edit {type === 'timeline' ? 'Timeline Entry' : 'Era Span'}
        </div>
        {type === 'timeline' ? (
          <>{inp('label', 'Event Label')}{inp('ly', 'Lajen Date (HC)')}{inp('my', 'Mnaerah Date')}{inp('desc', 'Description')}</>
        ) : (
          <>{inp('name', 'Era Name')}{inp('ly', 'Lajen Years')}{inp('my', 'Mnaerah Years')}{inp('desc', 'Description')}</>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" style={{ background: CAL_COLOR, color: '#000' }}
            onClick={() => { onSave(form); onClose() }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Eras sub-tab ─────────────────────────────────────────────────
function ErasView({ db }) {
  const [timeline, setTimeline] = useState(() => {
    try { const s = db?.getSetting?.('eras_timeline'); return s ? JSON.parse(s) : ERA_TIMELINE } catch { return ERA_TIMELINE }
  })
  const [spans, setSpans] = useState(() => {
    try { const s = db?.getSetting?.('eras_spans'); return s ? JSON.parse(s) : ERA_SPANS } catch { return ERA_SPANS }
  })
  const [editItem, setEditItem] = useState(null)
  const [editType, setEditType] = useState(null)
  const [editIdx, setEditIdx] = useState(null)

  useEffect(() => {
    const savedTl = db?.getSetting?.('eras_timeline')
    const savedSp = db?.getSetting?.('eras_spans')
    if (savedTl) { try { setTimeline(JSON.parse(savedTl)) } catch {} }
    if (savedSp) { try { setSpans(JSON.parse(savedSp)) } catch {} }
  }, [db?.settings])

  function handleSaveTimeline(form) {
    const next = timeline.map((e, i) => i === editIdx ? { ...e, ...form } : e)
    setTimeline(next); db?.saveSetting?.('eras_timeline', JSON.stringify(next))
  }
  function handleSaveSpan(form) {
    const next = spans.map((s, i) => i === editIdx ? { ...s, ...form } : s)
    setSpans(next); db?.saveSetting?.('eras_spans', JSON.stringify(next))
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
        <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>HC 320 = 1554 AD · 8.52 Lajen years = 1 Mnaerah year · All dates EXPLORATORY</div>
      </div>

      {/* Era spans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
        {spans.map((s, i) => (
          <div key={s.name} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderTop: `3px solid ${s.col}`, borderRadius: 'var(--r)', padding: 10, textAlign: 'center', position: 'relative' }}>
            <button onClick={() => { setEditItem(s); setEditType('span'); setEditIdx(i) }}
              style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: 'var(--mut)', fontSize: '0.85em', cursor: 'pointer' }} title="Edit">✎</button>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.92em', color: s.col }}>{s.name}</div>
            <div style={{ fontSize: '1.23em', fontWeight: 700, margin: '4px 0' }}>{s.ly}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--dim)' }}>{s.my}</div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: CAL_COLOR, marginBottom: 12 }}>Timeline</div>
        <div style={{ position: 'relative', paddingLeft: 90 }}>
          {timeline.map((e, i) => {
            const isLast = i === timeline.length - 1
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
                <div style={{ padding: '0 0 12px 8px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.92em', fontWeight: 600, color: e.col }}>{e.label}</div>
                    <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 1 }}>{e.desc}</div>
                  </div>
                  <button onClick={() => { setEditItem(e); setEditType('timeline'); setEditIdx(i) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mut)', fontSize: '0.85em', cursor: 'pointer', flexShrink: 0 }}>✎</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: CAL_COLOR, marginBottom: 4 }}>Conversion Table</div>
        <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>Anchor: HC 320 = 1554 AD. Earth-history sections collapsed by default.</div>
        <div style={{ overflowX: 'auto' }}>
          {ERA_TABLE.map(cat => (
            <details key={cat.cat} open={lajenCore.has(cat.cat)} style={{ marginBottom: 4 }}>
              <summary style={{ fontSize: '0.77em', fontWeight: 700, color: CAL_COLOR, padding: '6px 4px', cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '.06em', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: CAL_COLOR, whiteSpace: 'nowrap' }}>{fmt(r.mc)} MY</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      </div>

      {editItem && (
        <EraEditModal item={editItem} type={editType}
          onSave={editType === 'timeline' ? handleSaveTimeline : handleSaveSpan}
          onClose={() => { setEditItem(null); setEditType(null); setEditIdx(null) }} />
      )}
    </div>
  )
}

// ── Main CalendarTab ──────────────────────────────────────────────
export default function CalendarTab({ db }) {
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' | 'eras'
  // Multi-open months: Set of month indices
  const [openMonths, setOpenMonths] = useState(new Set())
  const [expandAll, setExpandAll] = useState(false)
  const [gridSize, setGridSize] = useState(() => {
    try { return localStorage.getItem('colsize_calendar') || 'M' } catch { return 'M' }
  })
  const [dayModal, setDayModal] = useState(null)
  const [dayText, setDayText] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)

  const GRID_COLS = { XS: 6, S: 5, M: 4, L: 3, XL: 2 }

  const calEntries = db.db.calendar_entries || []
  const timelineEvents = db.db.timeline || []
  const chars = db.db.characters || []

  function toggleMonth(mi) {
    setOpenMonths(prev => {
      const next = new Set(prev)
      if (next.has(mi)) next.delete(mi)
      else next.add(mi)
      return next
    })
  }

  function toggleExpandAll() {
    setExpandAll(v => !v)
    setOpenMonths(new Set()) // clear individual selections when toggling expand-all off
  }

  function getEntriesForDay(mi, day) {
    return calEntries.filter(e => e.month_idx === mi && e.day === day)
  }

  function getCharBirthdays(monthName) {
    return chars.filter(c => c.birthday_lajen && c.birthday_lajen.toLowerCase().includes(monthName.toLowerCase()))
  }

  function getTimelineForMonth(monthName) {
    return timelineEvents.filter(e => (e.date_hc||'').toLowerCase().includes(monthName.toLowerCase()))
  }

  function openDayModal(mi, day) {
    setDayModal({ mi, day }); setDayText(''); setEditingEntry(null)
  }

  function saveEntry() {
    if (!dayText.trim() || !dayModal) return
    if (editingEntry) {
      db.upsertEntry('calendar_entries', { ...editingEntry, text: dayText })
    } else {
      db.upsertEntry('calendar_entries', {
        id: uid(), month_idx: dayModal.mi, day: dayModal.day,
        text: dayText, created: new Date().toISOString()
      })
    }
    setDayModal(null); setDayText(''); setEditingEntry(null)
  }

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setActiveTab(key)}
      style={{ fontSize: '0.85em', padding: '4px 14px', borderRadius: 16, fontWeight: 600, cursor: 'pointer',
        background: activeTab === key ? CAL_COLOR : 'var(--card)',
        color: activeTab === key ? '#000' : 'var(--dim)',
        border: `1px solid ${activeTab === key ? CAL_COLOR : 'var(--brd)'}` }}>{label}</button>
  )

  return (
    <div>
      {/* Sub-tab toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabBtn('calendar', '🌙 Calendar')}
        {tabBtn('eras', '⧖ Eras & Dating')}
      </div>

      {/* ── Eras sub-tab ── */}
      {activeTab === 'eras' && <ErasView db={db} />}

      {/* ── Calendar sub-tab ── */}
      {activeTab === 'calendar' && (
        <div>
          <div style={{ textAlign: 'center', padding: '8px 0 6px' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em', color: CAL_COLOR }}>🌙 The Lajen Calendar</div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>12 months × 30 days · 5-day week · 4 seasons × 90 days</div>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {['XS','S','M','L','XL'].map(s => (
                <button key={s} onClick={() => { setGridSize(s); try { localStorage.setItem('colsize_calendar', s) } catch {} }}
                  style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
                    background: gridSize === s ? CAL_COLOR : 'none',
                    color: gridSize === s ? '#000' : 'var(--dim)',
                    border: `1px solid ${gridSize === s ? CAL_COLOR : 'var(--brd)'}` }}>{s}</button>
              ))}
            </div>
            <button onClick={toggleExpandAll}
              style={{ fontSize: '0.85em', padding: '4px 14px', borderRadius: 8, cursor: 'pointer',
                background: expandAll ? CAL_COLOR : 'var(--card)',
                color: expandAll ? '#000' : 'var(--dim)',
                border: `1px solid ${expandAll ? CAL_COLOR : 'var(--brd)'}` }}>
              {expandAll ? '⊟ Collapse All' : '⊞ Expand All'}
            </button>
            {openMonths.size > 0 && !expandAll && (
              <button onClick={() => setOpenMonths(new Set())}
                style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 8, cursor: 'pointer',
                  background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)' }}>
                Close {openMonths.size} open
              </button>
            )}
          </div>

          <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS[gridSize]}, 1fr)` }}>
            {MONTHS.map((m, mi) => {
              const mc = MC[mi]
              const stc = SEASON_TAG_COLORS[m.ssn] || '#888'
              const isExp = expandAll || openMonths.has(mi)
              const birthdays = getCharBirthdays(m.n)
              const events = getTimelineForMonth(m.n)
              const dayEntries = calEntries.filter(e => e.month_idx === mi)

              return (
                <div key={mi} className="cal-month" style={{ borderTop: `2px solid ${mc}`, userSelect: 'none', border: `1px solid ${mc}`, background: isExp ? mc : 'transparent', color: isExp ? '#fff' : 'var(--dim)' }}
                  onClick={() => toggleMonth(mi)}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: isExp ? '1.1em' : '0.85em', fontWeight: 600, color: isExp ? '#fff' : mc }}>{m.num}. {m.n}</div>
                  <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{m.s} → {m.inc}</div>
                  <div style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 6, display: 'inline-block', margin: '3px 0', background: isExp ? 'rgba(255,255,255,.18)' : `${stc}18`, color: isExp ? '#fff' : stc, border: `1px solid ${isExp ? 'rgba(255,255,255,.35)' : `${stc}33`}` }}>{m.ssn}</div>
                  <div style={{ fontSize: '0.62em', color: isExp ? 'rgba(255,255,255,.82)' : 'var(--mut)' }}>{m.eq}</div>

                  {birthdays.map(c => (
                    <div key={c.id} style={{ borderLeft: '2px solid var(--cc)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>🎂 {c.name}</div>
                  ))}
                  {events.map(e => (
                    <div key={e.id} style={{ borderLeft: '2px solid var(--ct)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>⏳ {e.name}</div>
                  ))}
                  {dayEntries.length > 0 && (
                    <div style={{ fontSize: '0.62em', color: 'var(--cc)', marginTop: 2 }}>📝 {dayEntries.length} note{dayEntries.length > 1 ? 's' : ''}</div>
                  )}

                  {!birthdays.length && !events.length && !dayEntries.length && !isExp && (
                    <div style={{ fontSize: '0.62em', color: 'var(--mut)', fontStyle: 'italic' }}>Click to expand</div>
                  )}

                  {isExp && (
                    <div style={{ marginTop: 6, borderTop: '1px solid var(--brd)', paddingTop: 6 }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, marginBottom: 4 }}>
                        {WEEKDAYS.map(d => (
                          <div key={d} style={{ fontSize: '0.55em', color: 'var(--mut)', textAlign: 'center' }}>{d.slice(0,3)}</div>
                        ))}
                      </div>
                      <div className="day-grid">
                        {Array.from({ length: 30 }, (_, di) => {
                          const day = di + 1
                          const stored = getEntriesForDay(mi, day)
                          const hasEntry = stored.length > 0
                          return (
                            <div key={day} className={`day-cell${hasEntry ? ' has-entry' : ''}`}
                              title={`Day ${day} (${WEEKDAYS[di%5]}) — click to add note`}
                              onClick={() => openDayModal(mi, day)}>
                              <div style={{ fontWeight: 600, fontSize: '0.77em' }}>{day}</div>
                              <div dangerouslySetInnerHTML={{ __html: moonSVG(day) }} />
                              {hasEntry && (
                                <div style={{ fontSize: '0.55em', color: 'var(--cc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {stored[0].text.slice(0, 8)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Modal open={!!dayModal}
            onClose={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}
            title={dayModal ? `${MONTHS[dayModal.mi]?.n}, Day ${dayModal.day}` : ''}
            color={CAL_COLOR}>
            {dayModal && (
              <>
                {getEntriesForDay(dayModal.mi, dayModal.day).map(e => (
                  <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: '2px solid var(--cc)', borderRadius: 4, padding: '6px 8px', marginBottom: 4, fontSize: '0.85em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{e.text}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--cc)', cursor: 'pointer' }}
                        onClick={() => { setEditingEntry(e); setDayText(e.text) }}>✎</button>
                      <button style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer' }}
                        onClick={() => db.deleteEntry('calendar_entries', e.id)}>✕</button>
                    </div>
                  </div>
                ))}
                <div className="field">
                  <label>{editingEntry ? 'Edit Note' : 'Add Note'}</label>
                  <textarea value={dayText} placeholder="Note for this day…"
                    onChange={e => setDayText(e.target.value)} />
                </div>
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}>Cancel</button>
                  <button className="btn btn-primary" style={{ background: CAL_COLOR }} onClick={saveEntry}>
                    {editingEntry ? 'Update' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </Modal>
        </div>
      )}
    </div>
  )
}
