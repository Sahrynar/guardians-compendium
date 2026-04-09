import { useState } from 'react'
import Modal from '../components/common/Modal'
import { MONTHS, WEEKDAYS, SEASON_TAG_COLORS, ERA_TIMELINE, ERA_SPANS, uid } from '../constants'

const TAB_COLOR = '#4cc9f0' // Sky Blue

const MC = ['#00ffcc','#66cc99','#ff3366','#f4c430','#cc6622','#990000',
            '#4477cc','#7799cc','#a9c0d3','#7fff00','#bb77cc','#9400d3']

function moonSVG(day) {
  const r = 5
  if (day === 1 || day === 30) return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#ccc"/></svg>`
  if (day <= 8) { const f = 1-(day-1)/7; return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/><circle cx="6" cy="6" r="${r}" fill="#aaa" clip-path="inset(0 ${f*10}px 0 0)"/></svg>` }
  if (day <= 15) return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/></svg>`
  if (day <= 22) { const f = (day-15)/7; return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#333"/><circle cx="6" cy="6" r="${r}" fill="#aaa" clip-path="inset(0 0 0 ${(1-f)*10}px)"/></svg>` }
  return `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="${r}" fill="#aaa"/></svg>`
}

// ── Eras section (merged from Eras tab) ───────────────────────────
const ERA_TABLE = [
  { cat: 'SERIES ANCHORS', rows: [
    { mn:'~1516 AD', ev:'HC 1 — Lurlen falls, Rose flees',      my:37.5, hc:1,   lc:320, mc:4.4 },
    { mn:'1554 AD',  ev:'HC 320 — Book 1 opens, Lila arrives',  my:0,    hc:320, lc:0,   mc:0   },
  ]},
  { cat: 'RELIGIOUS / CULTURAL', rows: [
    { mn:'~1 AD',  ev:'Birth of Jesus',                              my:1553,  hc:-12912, lc:13232, mc:182 },
    { mn:'~33 AD', ev:'Crucifixion — Guardian sacrifice parallel',   my:1521,  hc:-12639, lc:12959, mc:179 },
  ]},
  { cat: 'EARLY HUMANITY', rows: [
    { mn:'~300,000 BC', ev:'First Homo sapiens (Africa)',           my:301554, hc:-2568920, lc:2569240, mc:35394 },
    { mn:'~70,000 BC',  ev:'Toba supervolcano / human bottleneck',  my:71554,  hc:-609320,  lc:609640,  mc:8399  },
    { mn:'~40,000 BC',  ev:'Cave art / behavioural modernity',      my:41554,  hc:-353720,  lc:354040,  mc:4877  },
    { mn:'~23,000 BC',  ev:'White Sands footprints (Americas)',     my:24554,  hc:-208880,  lc:209200,  mc:2882  },
  ]},
  { cat: 'CATACLYSMS & DISASTERS', rows: [
    { mn:'~10,800 BC', ev:'Younger Dryas impact',                       my:12354, hc:-104936, lc:105256, mc:1450 },
    { mn:'~9,600 BC',  ev:'End of Younger Dryas / Holocene',            my:11154, hc:-94712,  lc:95032,  mc:1309 },
    { mn:'~6,500 BC',  ev:'Doggerland final submergence',               my:8054,  hc:-68300,  lc:68620,  mc:945  },
    { mn:'~5,600 BC',  ev:'Black Sea Deluge hypothesis',                my:7154,  hc:-60612,  lc:60932,  mc:840  },
    { mn:'~1,600 BC',  ev:'Thera/Santorini eruption (Minoan collapse)', my:3154,  hc:-26552,  lc:26872,  mc:370  },
  ]},
  { cat: 'MONUMENT BUILDING', rows: [
    { mn:'~3,000 BC', ev:'Stonehenge Phase 1',          my:4554, hc:-38480, lc:38800, mc:535 },
    { mn:'~2,560 BC', ev:'Great Pyramid of Giza',       my:4114, hc:-34731, lc:35051, mc:483 },
    { mn:'~2,550 BC', ev:'Stonehenge Phase 3 — sarsen', my:4104, hc:-34646, lc:34966, mc:482 },
    { mn:'~1,600 BC', ev:'Stonehenge final phase',      my:3154, hc:-26552, lc:26872, mc:370 },
  ]},
]

function fmt(n) {
  if (n === 0) return '0'
  if (typeof n !== 'number') return n
  if (n >= 10000) return '~' + Math.round(n).toLocaleString()
  if (n < 10) return '~' + n.toFixed(1)
  return '~' + Math.round(n).toLocaleString()
}

function ErasSection() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 16, marginTop: 24 }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', color: TAB_COLOR, marginBottom: 12 }}>⧖ Eras & Dating</div>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 12 }}>HC 320 = 1554 AD · 8.52 Lajen years = 1 Mnaerah year · All dates EXPLORATORY</div>

      {/* Era spans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
        {ERA_SPANS.map(s => (
          <div key={s.name} style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderTop: `3px solid ${s.col}`, borderRadius: 'var(--r)', padding: 8, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.85em', color: s.col }}>{s.name}</div>
            <div style={{ fontSize: '1.23em', fontWeight: 700, margin: '3px 0' }}>{s.ly}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--dim)' }}>{s.my}</div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <div style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 'var(--r)', padding: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: TAB_COLOR, marginBottom: 10 }}>Timeline</div>
        <div style={{ position: 'relative', paddingLeft: 90 }}>
          {ERA_TIMELINE.map((e, i) => {
            const isLast = i === ERA_TIMELINE.length - 1
            return (
              <div key={i} style={{ display: 'flex', minHeight: i===0?40:48, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -90, width: 80, textAlign: 'right', paddingRight: 10, fontSize: '0.77em' }}>
                  <div style={{ fontWeight: 600 }}>{e.ly}</div>
                  <div style={{ color: 'var(--mut)', fontSize: '0.85em' }}>{e.my}</div>
                </div>
                <div style={{ position: 'relative', width: 14, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.col, position: 'absolute', top: 3, left: 2, zIndex: 1 }} />
                  {!isLast && <div style={{ position: 'absolute', left: 6, top: 13, bottom: 0, width: 2, background: e.col, opacity: .4 }} />}
                </div>
                <div style={{ padding: '0 0 10px 8px', flex: 1 }}>
                  <div style={{ fontSize: '0.92em', fontWeight: 600, color: e.col }}>{e.label}</div>
                  <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 1 }}>{e.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion table */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 6 }}>Anchor: HC 320 = 1554 AD. Earth-history sections collapsed by default.</div>
        {ERA_TABLE.map(cat => (
          <details key={cat.cat} style={{ marginBottom: 4 }}
            open={cat.cat === 'SERIES ANCHORS' || cat.cat === 'RELIGIOUS / CULTURAL'}>
            <summary style={{ fontSize: '0.77em', fontWeight: 700, color: TAB_COLOR, padding: '5px 4px',
              cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '.06em',
              listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {cat.cat} <span style={{ fontSize: '0.85em', color: 'var(--mut)', fontWeight: 400, textTransform: 'none' }}>({cat.rows.length})</span>
            </summary>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77em', marginBottom: 4 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--brd)' }}>
                  {['Mnaerah','Event','MY before 1554','HC Date','Lajen clock','Mnaerah clock'].map(h => (
                    <th key={h} style={{ textAlign: h==='Event'?'left':'right', padding: '3px 5px', color: 'var(--dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.rows.map((r, i) => (
                  <tr key={i} style={{ background: i%2?'rgba(255,255,255,.015)':'transparent', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: '4px 5px', whiteSpace: 'nowrap', color: 'var(--ct)', textAlign: 'right' }}>{r.mn}</td>
                    <td style={{ padding: '4px 5px', color: 'var(--tx)' }}>{r.ev}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', color: 'var(--dim)' }}>{fmt(r.my)}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', color: 'var(--cc)', whiteSpace: 'nowrap' }}>{typeof r.hc==='number'&&r.hc<0?`HC ${fmt(r.hc)}`:`HC ${r.hc}`}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', color: 'var(--cl)', whiteSpace: 'nowrap' }}>{fmt(r.lc)} LY</td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', color: TAB_COLOR, whiteSpace: 'nowrap' }}>{fmt(r.mc)} MY</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </div>
  )
}

// ── Main Calendar tab ─────────────────────────────────────────────
export default function CalendarTab({ db, navSearch }) {
  // Multi-open: Set of open month indices
  const [openMonths, setOpenMonths] = useState(new Set())
  const [dayModal, setDayModal] = useState(null)
  const [dayText, setDayText] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)
  const [showEras, setShowEras] = useState(false)

  const calEntries = db.db.calendar_entries || []
  const timelineEvents = db.db.timeline || []
  const chars = db.db.characters || []

  function toggleMonth(mi) {
    setOpenMonths(prev => {
      const next = new Set(prev)
      next.has(mi) ? next.delete(mi) : next.add(mi)
      return next
    })
  }
  function openAll() { setOpenMonths(new Set(MONTHS.map((_, i) => i))) }
  function closeAll() { setOpenMonths(new Set()) }

  function getEntriesForDay(mi, day) { return calEntries.filter(e => e.month_idx === mi && e.day === day) }
  function getCharBirthdays(monthName) { return chars.filter(c => c.birthday_lajen && c.birthday_lajen.toLowerCase().includes(monthName.toLowerCase())) }
  function getTimelineForMonth(monthName) { return timelineEvents.filter(e => (e.date_hc||'').toLowerCase().includes(monthName.toLowerCase())) }

  function openDayModal(mi, day) { setDayModal({ mi, day }); setDayText(''); setEditingEntry(null) }

  function saveEntry() {
    if (!dayText.trim() || !dayModal) return
    if (editingEntry) {
      db.upsertEntry('calendar_entries', { ...editingEntry, text: dayText })
    } else {
      db.upsertEntry('calendar_entries', { id: uid(), month_idx: dayModal.mi, day: dayModal.day, text: dayText, created: new Date().toISOString() })
    }
    setDayModal(null); setDayText(''); setEditingEntry(null)
  }

  function deleteEntry(id) { db.deleteEntry('calendar_entries', id) }

  // Filter by navSearch
  const search = (navSearch || '').toLowerCase()
  const visibleMonths = MONTHS.filter(m =>
    !search || m.n.toLowerCase().includes(search) || m.s.toLowerCase().includes(search) ||
    m.inc.toLowerCase().includes(search) || m.ssn.toLowerCase().includes(search)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: TAB_COLOR }}>🌙 The Lajen Calendar</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={openAll}
            style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 6, border: `1px solid ${TAB_COLOR}`, background: 'none', color: TAB_COLOR, cursor: 'pointer' }}>
            Open All
          </button>
          <button onClick={closeAll}
            style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            Close All
          </button>
          <button onClick={() => setShowEras(s => !s)}
            style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 6,
              border: `1px solid ${showEras ? TAB_COLOR : 'var(--brd)'}`,
              background: showEras ? TAB_COLOR + '22' : 'none',
              color: showEras ? TAB_COLOR : 'var(--dim)', cursor: 'pointer' }}>
            ⧖ Eras & Dating
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginBottom: 12, textAlign: 'center' }}>
        12 months × 30 days · 5-day week · 4 seasons × 90 days · Click any month to open/close
      </div>

      {/* Month grid — multi-open */}
      <div className="cal-grid">
        {(search ? visibleMonths : MONTHS).map((m, rawIdx) => {
          const mi = MONTHS.indexOf(m)
          const mc = MC[mi]
          const stc = SEASON_TAG_COLORS[m.ssn] || '#888'
          const isOpen = openMonths.has(mi)
          const birthdays = getCharBirthdays(m.n)
          const events = getTimelineForMonth(m.n)
          const dayEntries = calEntries.filter(e => e.month_idx === mi)

          return (
            <div key={mi} className="cal-month"
              style={{ borderTop: `2px solid ${mc}`, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleMonth(mi)}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.85em', fontWeight: 600, color: mc }}>{m.num}. {m.n}</div>
              <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{m.s} → {m.inc}</div>
              <div style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 6, display: 'inline-block', margin: '3px 0', background: `${stc}18`, color: stc, border: `1px solid ${stc}33` }}>{m.ssn}</div>
              <div style={{ fontSize: '0.62em', color: 'var(--mut)' }}>{m.eq}</div>

              {birthdays.map(c => (
                <div key={c.id} style={{ borderLeft: '2px solid var(--cc)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>🎂 {c.name}</div>
              ))}
              {events.map(e => (
                <div key={e.id} style={{ borderLeft: '2px solid var(--ct)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>⏳ {e.name}</div>
              ))}
              {dayEntries.length > 0 && (
                <div style={{ fontSize: '0.62em', color: TAB_COLOR, marginTop: 2 }}>📝 {dayEntries.length} note{dayEntries.length > 1 ? 's' : ''}</div>
              )}

              {!birthdays.length && !events.length && !dayEntries.length && !isOpen && (
                <div style={{ fontSize: '0.62em', color: 'var(--mut)', fontStyle: 'italic' }}>Click to expand</div>
              )}

              {/* Expanded day grid */}
              {isOpen && (
                <div style={{ marginTop: 6, borderTop: '1px solid var(--brd)', paddingTop: 6 }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, marginBottom: 4 }}>
                    {WEEKDAYS.map(d => (
                      <div key={d} style={{ fontSize: '0.54em', color: 'var(--mut)', textAlign: 'center' }}>{d.slice(0,3)}</div>
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
                            <div style={{ fontSize: '0.54em', color: TAB_COLOR, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* Eras section — toggled */}
      {showEras && <ErasSection />}

      {/* Day modal */}
      <Modal open={!!dayModal} onClose={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}
        title={dayModal ? `${MONTHS[dayModal.mi]?.n}, Day ${dayModal.day}` : ''} color={TAB_COLOR}>
        {dayModal && (
          <>
            {getEntriesForDay(dayModal.mi, dayModal.day).map(e => (
              <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: `2px solid ${TAB_COLOR}`, borderRadius: 4, padding: '6px 8px', marginBottom: 4, fontSize: '0.85em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{e.text}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button style={{ background: 'none', border: 'none', color: TAB_COLOR, cursor: 'pointer' }}
                    onClick={() => { setEditingEntry(e); setDayText(e.text) }}>✎</button>
                  <button style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer' }}
                    onClick={() => deleteEntry(e.id)}>✕</button>
                </div>
              </div>
            ))}
            <div className="field">
              <label>{editingEntry ? 'Edit Note' : 'Add Note'}</label>
              <textarea value={dayText} placeholder="e.g. Thomas's birthday (Day 30 of Rhamilune)" onChange={e => setDayText(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}>Cancel</button>
              <button className="btn btn-primary" style={{ background: TAB_COLOR }} onClick={saveEntry}>
                {editingEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
