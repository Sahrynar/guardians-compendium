import { useState } from 'react'
import Modal from '../components/common/Modal'
import { MONTHS, WEEKDAYS, SEASON_TAG_COLORS, uid } from '../constants'

const MC = ['#00ffcc','#66cc99','#ff3366','#f4c430','#cc6622','#990000','#4477cc','#7799cc','#a9c0d3','#7fff00','#bb77cc','#9400d3']

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

export default function CalendarTab({ db }) {
  const [expandedMonth, setExpandedMonth] = useState(null)
  const [expandAll, setExpandAll] = useState(false)
  const [gridSize, setGridSize] = useState('M') // XS S M L XL
  const [dayModal, setDayModal] = useState(null)
  const [dayText, setDayText] = useState('')
  const [editingEntry, setEditingEntry] = useState(null)

  const GRID_COLS = { XS: 6, S: 5, M: 4, L: 3, XL: 2 }

  const calEntries = db.db.calendar_entries || []
  const timelineEvents = db.db.timeline || []
  const chars = db.db.characters || []

  function getEntriesForDay(mi, day) {
    return calEntries.filter(e => e.month_idx === mi && e.day === day)
  }

  // Auto-pull birthday events from characters
  function getCharBirthdays(monthName) {
    return chars.filter(c => c.birthday_lajen && c.birthday_lajen.toLowerCase().includes(monthName.toLowerCase()))
  }

  // Auto-pull timeline events that mention this month
  function getTimelineForMonth(monthName) {
    return timelineEvents.filter(e => (e.date_hc||'').toLowerCase().includes(monthName.toLowerCase()))
  }

  function openDayModal(mi, day) {
    setDayModal({ mi, day })
    setDayText('')
    setEditingEntry(null)
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

  function deleteEntry(id) {
    db.deleteEntry('calendar_entries', id)
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: 'var(--cca)' }}>🌙 The Lajen Calendar</div>
        <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>12 months × 30 days · 5-day week · 4 seasons × 90 days</div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => { setExpandAll(v => !v); setExpandedMonth(null) }}
          style={{ fontSize: '0.85em', padding: '4px 14px', borderRadius: 8, cursor: 'pointer',
            background: expandAll ? 'var(--cca)' : 'var(--card)',
            color: expandAll ? '#000' : 'var(--dim)',
            border: `1px solid ${expandAll ? 'var(--cca)' : 'var(--brd)'}` }}>
          {expandAll ? '⊟ Collapse All' : '⊞ Expand All'}
        </button>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span style={{ fontSize: '0.69em', color: 'var(--mut)', marginRight: 4 }}>SIZE</span>
          {['XS','S','M','L','XL'].map(s => (
            <button key={s} onClick={() => setGridSize(s)}
              style={{ fontSize: '0.77em', padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                background: gridSize === s ? 'var(--cca)' : 'none',
                color: gridSize === s ? '#000' : 'var(--dim)',
                border: `1px solid ${gridSize === s ? 'var(--cca)' : 'var(--brd)'}` }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="cal-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS[gridSize]}, 1fr)` }}>
        {MONTHS.map((m, mi) => {
          const mc = MC[mi]
          const stc = SEASON_TAG_COLORS[m.ssn] || '#888'
          const isExp = expandAll || expandedMonth === mi
          const birthdays = getCharBirthdays(m.n)
          const events = getTimelineForMonth(m.n)
          const dayEntries = calEntries.filter(e => e.month_idx === mi)

          return (
            <div key={mi} className="cal-month" style={{ borderTop: `2px solid ${mc}` }} onClick={() => !expandAll && setExpandedMonth(isExp ? null : mi)}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85em', fontWeight: 600, color: mc }}>{m.num}. {m.n}</div>
              <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{m.s} → {m.inc}</div>
              <div style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 6, display: 'inline-block', margin: '3px 0', background: `${stc}18`, color: stc, border: `1px solid ${stc}33` }}>{m.ssn}</div>
              <div style={{ fontSize: '0.62em', color: 'var(--mut)' }}>{m.eq}</div>

              {/* Birthdays and events preview */}
              {birthdays.map(c => (
                <div key={c.id} style={{ borderLeft: '2px solid var(--cc)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>🎂 {c.name}</div>
              ))}
              {events.map(e => (
                <div key={e.id} style={{ borderLeft: '2px solid var(--ct)', fontSize: '0.69em', paddingLeft: 4, marginTop: 2 }}>⏳ {e.name}</div>
              ))}
              {dayEntries.length > 0 && (
                <div style={{ fontSize: '0.62em', color: 'var(--cc)', marginTop: 2 }}>📝 {dayEntries.length} note{dayEntries.length > 1 ? 's' : ''}</div>
              )}

              {!birthdays.length && !events.length && !dayEntries.length && !isExp && !expandAll && (
                <div style={{ fontSize: '0.62em', color: 'var(--mut)', fontStyle: 'italic' }}>Click to expand</div>
              )}

              {/* Expanded day grid */}
              {isExp && (
                <div style={{ marginTop: 6, borderTop: '1px solid var(--brd)', paddingTop: 6 }} onClick={e => e.stopPropagation()}>
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
                        <div
                          key={day}
                          className={`day-cell${hasEntry ? ' has-entry' : ''}`}
                          title={`Day ${day} (${WEEKDAYS[di%5]}) — click to add note`}
                          onClick={() => openDayModal(mi, day)}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.77em' }}>{day}</div>
                          <div dangerouslySetInnerHTML={{ __html: moonSVG(day) }} />
                          {hasEntry && (
                            <div style={{ fontSize: '0.54em', color: 'var(--cc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* Day modal */}
      <Modal
        open={!!dayModal}
        onClose={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}
        title={dayModal ? `${MONTHS[dayModal.mi]?.n}, Day ${dayModal.day}` : ''}
        color="var(--cca)"
      >
        {dayModal && (
          <>
            {/* Existing entries */}
            {getEntriesForDay(dayModal.mi, dayModal.day).map(e => (
              <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: '2px solid var(--cc)', borderRadius: 4, padding: '6px 8px', marginBottom: 4, fontSize: '0.85em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{e.text}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--cc)', cursor: 'pointer', fontSize: '0.85em' }}
                    onClick={() => { setEditingEntry(e); setDayText(e.text) }}
                  >✎</button>
                  <button
                    style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', fontSize: '0.85em' }}
                    onClick={() => deleteEntry(e.id)}
                  >✕</button>
                </div>
              </div>
            ))}

            <div className="field">
              <label>{editingEntry ? 'Edit Note' : 'Add Note'}</label>
              <textarea
                value={dayText}
                placeholder={`e.g. Thomas's birthday (Day 30 of Rhamilune)`}
                onChange={e => setDayText(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setDayModal(null); setDayText(''); setEditingEntry(null) }}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--cca)' }} onClick={saveEntry}>
                {editingEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
