import { useState, useEffect, useRef } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, SL, uid } from '../constants'

const TL_COLOR = '#0fb5a0'
// XS = many small cols, XL = 1 full-width large col
const TL_SIZE_COLS = { XS: 4, S: 3, M: 2, L: 1, XL: 1 }
// XL also shows more detail in expanded state (label vs full detail)
const TL_SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL']

const TL_FIELDS = [
  { k: 'name',          l: 'Event',          t: 'text', r: true },
  { k: 'date_hc',       l: 'Date (HC)',       t: 'text' },
  { k: 'date_mnaerah',  l: 'Date (Mnaerah)',  t: 'text' },
  { k: 'sort_order',    l: 'Sort #',          t: 'text' },
  { k: 'era',           l: 'Era',             t: 'sel', o: ['','Ancient/Pre-History','Pre-Series','Book 1','Book 2','Between Books','Book 3','Future'] },
  { k: 'detail',        l: 'Detail',          t: 'ta' },
]

const ERA_BANDS = {
  'Ancient/Pre-History': 'rgba(201,102,255,.08)',
  'Pre-Series':          'rgba(255,170,51,.08)',
  'Book 1':              'rgba(0,229,204,.08)',
  'Book 2':              'rgba(51,136,255,.08)',
  'Between Books':       'rgba(255,112,64,.06)',
  'Book 3':              'rgba(255,51,85,.08)',
  'Future':              'rgba(122,204,122,.08)',
}
const DOT_COLS = ['var(--ct)','var(--cc)','var(--ccn)','var(--cl)','var(--ci)','var(--cw)','var(--cq)']

export default function Timeline({ db, navSearch }) {
  const events = db.db.timeline || []
  const [search, setSearch] = useState('')

  // Sync top nav search
  useEffect(() => { setSearch(navSearch || '') }, [navSearch])
  const [filterEra, setFilterEra] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [showVisual, setShowVisual] = useState(true)
  const [colSize, setColSize] = useState(() => { try { return localStorage.getItem('colsize_timeline') || 'M' } catch { return 'M' } })
  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_timeline', sz) } catch {} }
  useEffect(() => { setSearch(navSearch || '') }, [navSearch])
  const trackRef = useRef()

  const sorted = [...events]
    .filter(e => {
      const ms = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
      const me = filterEra === 'all' || e.era === filterEra
      return ms && me
    })
    .sort((a,b) => (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0))

  const eras = [...new Set(events.map(e => e.era).filter(Boolean))]

  function handleSave(entry) {
    db.upsertEntry('timeline', entry)
    setModalOpen(false); setEditing(null)
    setExpanded(entry.id)
    // Auto-add to calendar if it has a Lajen date with month name
    // (handled in CalendarTab via reading timeline entries)
  }

  // Visual timeline calculations
  const hasVisual = sorted.length > 0
  const w = Math.max(800, sorted.length * 170)
  const nums = sorted.map(e => parseFloat(e.sort_order)||0)
  const mn = Math.min(...nums), mx = Math.max(...nums)
  const rng = Math.max(1, mx - mn)
  function xPos(e) { return 30 + (w - 60) * ((parseFloat(e.sort_order)||0) - mn) / rng }

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {TL_SIZE_LABELS.map(l => (
            <button key={l} onClick={() => changeColSize(l)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: colSize===l ? TL_COLOR : 'none', color: colSize===l ? '#000' : 'var(--dim)', border: `1px solid ${colSize===l ? TL_COLOR : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-sm btn-outline" onClick={() => setShowVisual(v => !v)}>
          {showVisual ? 'Hide' : 'Show'} Track
        </button>
        <button className="btn btn-primary btn-sm" style={{ background: '#0fb5a0' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Era filter pills */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          <button className={`fp ${filterEra==='all'?'active':''}`} onClick={() => setFilterEra('all')}>All</button>
          {eras.map(era => (
            <button key={era} className={`fp ${filterEra===era?'active':''}`} style={{ background: filterEra===era ? ERA_BANDS[era]||'rgba(255,255,255,.05)':'' }} onClick={() => setFilterEra(filterEra===era?'all':era)}>{era}</button>
          ))}
        </div>
      </div>

      {/* Visual track */}
      {showVisual && hasVisual && (
        <div style={{ overflowX: 'auto', cursor: 'grab', padding: '12px 0 16px', WebkitOverflowScrolling: 'touch' }} ref={trackRef}>
          <div style={{ position: 'relative', minHeight: 180, padding: '0 30px', width: w }}>
            {/* Era bands */}
            {Object.entries(ERA_BANDS).map(([era, bg]) => {
              const eraEs = sorted.filter(e => e.era === era)
              if (!eraEs.length) return null
              const xs = eraEs.map(xPos)
              const x1 = Math.max(0, Math.min(...xs) - 20)
              const x2 = Math.max(...xs) + 20
              return (
                <div key={era} style={{ position: 'absolute', left: x1, width: x2-x1, top: 20, height: 140, background: bg, borderRadius: 6, pointerEvents: 'none' }}>
                  <div style={{ fontSize: '0.62em', color: 'rgba(255,255,255,.25)', padding: '2px 4px', pointerEvents: 'none' }}>{era}</div>
                </div>
              )
            })}
            {/* Line */}
            <div style={{ position: 'absolute', top: 50, left: 15, right: 15, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,var(--ct),var(--cc),var(--ccn),var(--cca),var(--cl))' }} />
            {/* Dots and labels */}
            {sorted.map((e, i) => {
              const x = xPos(e)
              const col = DOT_COLS[i % DOT_COLS.length]
              return (
                <div key={e.id}>
                  <div className="timeline-dot" style={{ left: x-6, background: col }} onClick={() => setExpanded(exp => exp===e.id?null:e.id)} title={e.name} />
                  <div className="timeline-label" style={{ left: Math.max(0, Math.min(w-170, x-80)), top: i%2 ? 72 : 115, borderTop: `2px solid ${col}` }}>
                    <div style={{ fontWeight: 700, fontSize: '0.77em' }}>{e.name}</div>
                    <div style={{ color: 'var(--dim)', fontSize: '0.69em' }}>{[e.date_hc, e.date_mnaerah].filter(Boolean).join(' / ')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: TL_SIZE_COLS[colSize] > 1 ? `repeat(${TL_SIZE_COLS[colSize]}, minmax(0,1fr))` : '1fr', gap: 6, marginTop: 10 }}>
        {!sorted.length && (
          <div className="empty"><div className="empty-icon">⏳</div><p>No events yet.</p>
            <button className="btn btn-primary" style={{ background: '#0fb5a0' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Event</button>
          </div>
        )}
        {sorted.map((e, i) => {
          const isOpen = expanded === e.id
          return (
            <div key={e.id} className="entry-card" style={{ '--card-color': 'var(--ct)' }} onClick={() => colSize !== 'XL' && setExpanded(isOpen?null:e.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.name||'', search) }} />
                <div style={{ fontSize: '0.77em', color: '#0fb5a0' }}>{[e.date_hc, e.date_mnaerah].filter(Boolean).join(' / ')}</div>
              </div>
              <div className="entry-meta">
                {e.era && <span className="badge" style={{ color: 'var(--cca)', borderColor: 'rgba(255,170,51,.3)' }}>{e.era}</span>}
                {e.status && <span className={`badge badge-${e.status}`}>{SL[e.status]}</span>}
              </div>
              {(isOpen || colSize === 'XL') && (
                <>
                  <div className="entry-detail">
                    {e.detail && <div>{e.detail}</div>}
                  </div>
                  {e.notes && <div className="entry-notes">{e.notes}</div>}
                  <div className="entry-actions">
                    <button className="btn btn-sm btn-outline" style={{ color: '#0fb5a0', borderColor: '#0fb5a0' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                    <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id?'Edit':'Add'} Event`} color="var(--ct)">
        <EntryForm fields={TL_FIELDS} entry={editing||{}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--ct)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{events.find(e=>e.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('timeline',confirmId); setConfirmId(null); if(expanded===confirmId) setExpanded(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
