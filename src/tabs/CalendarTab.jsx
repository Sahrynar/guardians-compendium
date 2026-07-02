import { useState, useEffect } from 'react'
import Modal from '../components/common/Modal'
import ErasView from './Eras'
import { MONTHS, WEEKDAYS, SEASON_COLORS, SEASON_TAG_COLORS, TAB_RAINBOW, uid } from '../constants'
const CAL_COLOR = TAB_RAINBOW['calendar'] || '#aaaaaa'

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
              const mc = SEASON_COLORS[m.ssn] || CAL_COLOR
              const stc = SEASON_TAG_COLORS[m.ssn] || '#888'
              const isExp = expandAll || openMonths.has(mi)
              const birthdays = getCharBirthdays(m.n)
              const events = getTimelineForMonth(m.n)
              const dayEntries = calEntries.filter(e => e.month_idx === mi)

              return (
                <div key={mi} className="cal-month" style={{ borderTop: `2px solid ${mc}`, userSelect: 'none', border: `1px solid ${mc}`, background: isExp ? mc : 'transparent', color: isExp ? '#fff' : 'var(--dim)' }}
                  onClick={() => toggleMonth(mi)}>
                  <div style={{ height: 4, borderRadius: 999, background: mc, marginBottom: 8, opacity: isExp ? 0.95 : 0.8 }} />
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
                    <div style={{ marginTop: 6, borderTop: '1px solid var(--div)', paddingTop: 6 }}
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
