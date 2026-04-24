import { useState, useRef, useCallback, useEffect } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, SL, uid } from '../constants'
import { scrollAndFlashEntry } from '../components/common/entryNav'

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

export default function Timeline({ db, crossLink, clearCrossLink }) {
  const events = db.db.timeline || []
  const [search, setSearch] = useState('')
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('tl_cols') || '2'))
  function saveColCount(n) { setColCount(n); db.saveSetting?.('tl_cols', String(n)) }
  const [dividers, setDividers] = useState(() => db.getSetting?.('tl_cols_div') !== 'off')
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('tl_cols_div', next ? 'on' : 'off') }
  const [filterEra, setFilterEra] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [trackPopup, setTrackPopup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [autoOnly, setAutoOnly] = useState(false)
  const autoCount = events.filter(e => e.auto_imported === true).length

  useEffect(() => {
    if (crossLink?.search) {
      setSearch(crossLink.search)
      if (crossLink.expandName) {
        const match = events.find(e =>
          (e.name || '').toLowerCase() === crossLink.expandName.toLowerCase()
        )
        if (match) setExpanded(match.id)
      }
      clearCrossLink?.()
    }
  }, [crossLink, clearCrossLink, events])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = events.find(x => x.id === targetId)
      if (!entry) return
      setExpanded(targetId)
      setEditing(entry)
      setModalOpen(true)
      setTrackPopup(null)
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [events])
  const [showVisual, setShowVisual] = useState(true)
  const [listSort, setListSort] = useState('order')
  const [visualFilter, setVisualFilter] = useState('all') // independent era filter for visual track
  const [rangeMin, setRangeMin] = useState('') // HC date range filter min
  const [rangeMax, setRangeMax] = useState('') // HC date range filter max
  const [eraMarkers, setEraMarkers] = useState(() => {
    try { return JSON.parse(db.getSetting?.('timeline_era_markers') || '[]') } catch { return [] }
  })
  const [eraEditor, setEraEditor] = useState(false)
  const [editingMarker, setEditingMarker] = useState(null)
  const [zoom, setZoom] = useState(1)
  const trackRef = useRef()
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.85 : 1.18
    setZoom(z => Math.max(0.05, Math.min(12, z * delta)))
  }

  function handleMouseDown(e) {
    isDragging.current = true
    dragStart.current = { x: e.pageX, scrollLeft: trackRef.current?.scrollLeft || 0 }
    if (trackRef.current) trackRef.current.style.cursor = 'grabbing'
  }

  function handleMouseMove(e) {
    if (!isDragging.current || !trackRef.current) return
    const dx = e.pageX - dragStart.current.x
    trackRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }

  function handleMouseUp() {
    isDragging.current = false
    if (trackRef.current) trackRef.current.style.cursor = 'grab'
  }

  // Visual track: filtered by visualFilter era, always sorted by sort_order
  const visualEvents = [...events]
    .filter(e => {
      if (visualFilter !== 'all' && e.era !== visualFilter) return false
      if (rangeMin !== '') {
        const so = parseFloat(e.sort_order) || 0
        if (so < parseFloat(rangeMin)) return false
      }
      if (rangeMax !== '') {
        const so = parseFloat(e.sort_order) || 0
        if (so > parseFloat(rangeMax)) return false
      }
      return true
    })
    .sort((a,b) => (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0))

  // List: filtered by search + filterEra, sortable independently
  const sorted = [...events]
    .filter(e => {
      const ms = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
      const me = filterEra === 'all' || e.era === filterEra
      const ma = !autoOnly || e.auto_imported === true
      return ms && me && ma
    })
    .sort((a,b) => {
      if (listSort === 'alpha') return (a.name||'').localeCompare(b.name||'')
      if (listSort === 'era') return (a.era||'').localeCompare(b.era||'') || (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0)
      return (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0)
    })

  const eras = [...new Set(events.map(e => e.era).filter(Boolean))]

  function saveEraMarkers(markers) {
    setEraMarkers(markers)
    db.saveSetting?.('timeline_era_markers', JSON.stringify(markers))
  }

  function handleSave(entry) {
    if (!editing?.id) {
      const newName = (entry.name || '').toLowerCase().trim()
      const dupe = events.find(e => e.id !== entry.id && (e.name || '').toLowerCase().trim() === newName)
      if (dupe && !window.confirm(`An event named "${dupe.name}" already exists. Save anyway?`)) return
    }
    const stamped = { ...entry, updated_at: new Date().toISOString() }
    if (!editing?.id) stamped.created = stamped.created || stamped.updated_at
    db.upsertEntry('timeline', stamped)
    setModalOpen(false); setEditing(null)
    setExpanded(entry.id)
    // Auto-add to calendar if it has a Lajen date with month name
    // (handled in CalendarTab via reading timeline entries)
  }

  // Visual timeline calculations
  const hasVisual = visualEvents.length > 0
  const w = Math.max(800, visualEvents.length * 170) * zoom
  const nums = visualEvents.map(e => parseFloat(e.sort_order)||0)
  const mn = Math.min(...nums), mx = Math.max(...nums)
  const rng = Math.max(1, mx - mn)
  function xPos(e) { return 30 + (w - 60) * ((parseFloat(e.sort_order)||0) - mn) / rng }

  return (
    <div>
      <div className="tbar">
        <div style={{ display:'flex', gap:3 }}>
          {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
            <button key={l} onClick={() => saveColCount(n)}
              style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8,
                background: colCount===n ? 'var(--ct)' : 'none',
                color: colCount===n ? '#000' : 'var(--dim)',
                border: `1px solid ${colCount===n ? 'var(--ct)' : 'var(--brd)'}`,
                cursor:'pointer' }}>{l}</button>
          ))}
          <button onClick={toggleDividers}
            style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8, marginLeft:8,
              background: dividers ? 'rgba(255,255,255,.08)' : 'none',
              color: dividers ? 'var(--tx)' : 'var(--mut)',
              border:'1px solid var(--brd)', cursor:'pointer' }}>
            {dividers ? '┃ on' : '┃ off'}
          </button>
        <input className="sx" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-sm btn-outline" onClick={() => setShowVisual(v => !v)}>
          {showVisual ? 'Hide' : 'Show'} Track
        </button>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--ct)' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>
      </div>

      {/* Era filter pills */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          <button className={`fp ${filterEra==='all'?'active':''}`} onClick={() => setFilterEra('all')}>All</button>
          {eras.map(era => (
            <button key={era} className={`fp ${filterEra===era?'active':''}`} style={{ background: filterEra===era ? ERA_BANDS[era]||'rgba(255,255,255,.05)':'' }} onClick={() => setFilterEra(filterEra===era?'all':era)}>{era}</button>
          ))}
        </div>
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)}
            style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12,
              border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`,
              background: autoOnly ? '#ffcc0022' : 'none',
              color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
      </div>

      {/* Visual track */}
      {showVisual && (
        <>
          {/* Visual track independent filter */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontSize: '0.77em', color:'var(--mut)', alignSelf:'center' }}>Track filter:</span>
            <button className={`fp ${visualFilter==='all'?'active':''}`}
              style={{ fontSize: '0.77em' }} onClick={() => setVisualFilter('all')}>All</button>
            {eras.map(era => (
              <button key={era} className={`fp ${visualFilter===era?'active':''}`}
                style={{ fontSize: '0.77em', background: visualFilter===era ? ERA_BANDS[era]||'' : '' }}
                onClick={() => setVisualFilter(visualFilter===era?'all':era)}>{era}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, paddingLeft:4 }}>
            <span style={{ fontSize: '0.77em', color:'var(--mut)' }}>Zoom:</span>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.85em', padding:'2px 8px' }}
              onClick={() => setZoom(z => Math.max(0.05, z * 0.75))}>−</button>
            <span style={{ fontSize: '0.77em', color:'var(--dim)', minWidth:36, textAlign:'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.85em', padding:'2px 8px' }}
              onClick={() => setZoom(z => Math.min(12, z * 1.33))}>+</button>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.77em', padding:'2px 8px' }}
              onClick={() => setZoom(1)}>Reset</button>
            <span style={{ fontSize: '0.69em', color:'var(--mut)', marginLeft:4 }}>
              scroll or pinch to zoom · drag to pan
            </span>
            <span style={{ fontSize: '0.69em', color:'var(--dim)', marginLeft:8 }}>Range:</span>
            <input type="number" value={rangeMin} onChange={e => setRangeMin(e.target.value)}
              placeholder="Min sort#" title="Min sort order (leave blank for all)"
              style={{ width:70, fontSize: '0.69em', padding:'2px 5px', background:'var(--sf)',
                border:'1px solid var(--brd)', borderRadius:4, color:'var(--tx)' }} />
            <span style={{ fontSize: '0.69em', color:'var(--dim)' }}>–</span>
            <input type="number" value={rangeMax} onChange={e => setRangeMax(e.target.value)}
              placeholder="Max sort#"
              style={{ width:70, fontSize: '0.69em', padding:'2px 5px', background:'var(--sf)',
                border:'1px solid var(--brd)', borderRadius:4, color:'var(--tx)' }} />
            {(rangeMin || rangeMax) && (
              <button className="btn btn-sm btn-outline" style={{ fontSize: '0.69em', padding:'1px 6px' }}
                onClick={() => { setRangeMin(''); setRangeMax('') }}>Clear</button>
            )}
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.69em', padding:'1px 6px', color:'var(--cca)', borderColor:'var(--cca)' }}
              onClick={() => setEraEditor(true)} title="Manage era markers">⧖ Eras</button>
          </div>
          <div
            ref={trackRef}
            style={{ overflowX:'auto', cursor:'grab', padding:'12px 0 16px',
              WebkitOverflowScrolling:'touch', userSelect:'none' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}>
          <div style={{ position: 'relative', minHeight: 180, padding: '0 30px', width: w }}>
            {/* Custom era markers — positioned divs */}
            {eraMarkers.map((marker, mi) => {
              const x1 = 30 + (w - 60) * ((parseFloat(marker.start)||mn) - mn) / Math.max(1, rng)
              const x2 = 30 + (w - 60) * ((parseFloat(marker.end)||mx) - mn) / Math.max(1, rng)
              const col = marker.color || '#4488ff'
              return (
                <div key={mi} style={{ position:'absolute', left:x1, width:Math.max(2,x2-x1),
                  top:0, height:'100%', background:`${col}12`,
                  borderLeft:`2px solid ${col}88`, borderRight:`2px dashed ${col}66`,
                  pointerEvents:'none', zIndex:0 }}>
                  <div style={{ position:'absolute', top:4, left:4, fontSize: '0.69em',
                    color:col, fontWeight:700, whiteSpace:'nowrap', opacity:0.9 }}>
                    {marker.name}
                  </div>
                </div>
              )
            })}

            {/* Era bands */}
            {Object.entries(ERA_BANDS).map(([era, bg]) => {
              const eraEs = visualEvents.filter(e => e.era === era)
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
            {visualEvents.map((e, i) => {
              const x = xPos(e)
              const col = DOT_COLS[i % DOT_COLS.length]
              const labelRow = [62, 95, 128, 161][i % 4]
              const isSelected = trackPopup === e.id
              return (
                <div key={e.id}>
                  <div className="timeline-dot" style={{ left: x-6, background: col, outline: isSelected ? `2px solid #fff` : 'none', outlineOffset:2 }} onClick={() => setTrackPopup(tp => tp===e.id ? null : e.id)} title={e.name} />
                  <div className="timeline-label" style={{ left: Math.max(0, Math.min(w-170, x-80)), top: labelRow, borderTop: `2px solid ${col}`, background: isSelected ? `${col}22` : undefined, borderRadius: isSelected ? 4 : undefined }}>
                    <div style={{ fontWeight: 700, fontSize: '0.77em' }}>{e.name}</div>
                    <div style={{ color: 'var(--dim)', fontSize: '0.69em' }}>{[e.date_hc, e.date_mnaerah].filter(Boolean).join(' / ')}</div>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </>
      )}

      {/* Track popup */}
      {trackPopup && (() => {
        const ev = events.find(e => e.id === trackPopup)
        if (!ev) return null
        return (
          <div style={{ margin: '6px 0 10px', padding: '10px 14px',
            background: 'var(--card)', border: '1px solid var(--ct)',
            borderRadius: 8, position: 'relative' }}>
            <button onClick={() => setTrackPopup(null)}
              style={{ position:'absolute', top:8, right:10, background:'none',
                border:'none', color:'var(--mut)', cursor:'pointer', fontSize: '1.23em' }}>✕</button>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize: '1em', color:'var(--ct)', marginBottom:4 }}>{ev.name}</div>
            <div style={{ fontSize: '0.77em', color:'var(--cca)', marginBottom:6 }}>
              {[ev.date_hc, ev.date_mnaerah].filter(Boolean).join(' / ')}
              {ev.era && <span style={{ marginLeft:8, color:'var(--dim)' }}>{ev.era}</span>}
            </div>
            {ev.detail && <div style={{ fontSize: '0.85em', color:'var(--dim)', lineHeight:1.6, marginBottom:8 }}>{ev.detail}</div>}
            {ev.notes && <div style={{ fontSize: '0.85em', color:'var(--mut)', fontStyle:'italic' }}>{ev.notes}</div>}
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="btn btn-sm btn-outline" style={{ color:'var(--ct)', borderColor:'var(--ct)' }}
                onClick={() => { setEditing(ev); setModalOpen(true); setTrackPopup(null) }}>✎ Edit</button>
              <button className="btn btn-sm btn-outline" style={{ color:'#ff3355', borderColor:'#ff335544' }}
                onClick={() => { setConfirmId(ev.id); setTrackPopup(null) }}>✕ Delete</button>
            </div>
          </div>
        )
      })()}

      {/* List controls */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:12, marginBottom:4,
        flexWrap:'wrap' }}>
        <span style={{ fontSize: '0.77em', color:'var(--mut)' }}>List sort:</span>
        <button className={`fp ${listSort==='order'?'active':''}`}
          style={{ fontSize: '0.77em' }} onClick={() => setListSort('order')}>Story Order</button>
        <button className={`fp ${listSort==='alpha'?'active':''}`}
          style={{ fontSize: '0.77em' }} onClick={() => setListSort('alpha')}>A → Z</button>
        <button className={`fp ${listSort==='era'?'active':''}`}
          style={{ fontSize: '0.77em' }} onClick={() => setListSort('era')}>By Era</button>
      </div>

      {/* List */}
      <div className="cg" style={{ marginTop: 4, columns: colCount, columnGap: 12, columnRule: '1px solid var(--brd)' }}>
        {!sorted.length && (
          <div className="empty"><div className="empty-icon">⏳</div><p>No events yet.</p>
            <button className="btn btn-primary" style={{ background: 'var(--ct)' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Event</button>
          </div>
        )}
        {sorted.map((e, i) => {
          const isOpen = colCount === 1 || expanded === e.id  // XL auto-expands all
          return (
            <div key={e.id} id={`gcomp-entry-${e.id}`} className="entry-card" style={{ breakInside: 'avoid', marginBottom: 6, '--card-color': 'var(--ct)' }} onClick={() => setExpanded(isOpen?null:e.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.name||'', search) }} />
                <div style={{ fontSize: '0.77em', color: 'var(--ct)' }}>{[e.date_hc, e.date_mnaerah].filter(Boolean).join(' / ')}</div>
              </div>
              <div className="entry-meta">
                {e.era && <span className="badge" style={{ color: 'var(--cca)', borderColor: 'rgba(255,170,51,.3)' }}>{e.era}</span>}
                {e.status && <span className={`badge badge-${e.status}`}>{SL[e.status]}</span>}
              </div>
              {isOpen && (
                <>
                  <div className="entry-detail">
                    {e.detail && <div>{e.detail}</div>}
                  </div>
                  {e.notes && <div className="entry-notes">{e.notes}</div>}
                  <div className="entry-actions">
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--ct)', borderColor: 'var(--ct)' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                    <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Era Marker Editor */}
      {eraEditor && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.85)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setEraEditor(false)}>
          <div style={{ background:'var(--sf)', border:'1px solid var(--cca)',
            borderRadius:12, padding:20, maxWidth:480, width:'100%', maxHeight:'80vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize: '1.08em', color:'var(--cca)', marginBottom:14 }}>⧖ Era Markers</div>
            <div style={{ fontSize: '0.77em', color:'var(--dim)', marginBottom:10 }}>
              Markers appear as bands on the visual track. Use sort# values to set start/end positions.
            </div>
            {eraMarkers.map((m, i) => (
              <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6, padding:'6px 8px',
                background:'var(--card)', borderRadius:6, borderLeft:`3px solid ${m.color||'#4488ff'}` }}>
                <input value={m.name} onChange={e => { const n=[...eraMarkers]; n[i]={...n[i],name:e.target.value}; saveEraMarkers(n) }}
                  style={{ flex:1, fontSize: '0.85em', padding:'3px 6px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:4, color:'var(--tx)' }}
                  placeholder="Era name" />
                <input type="number" value={m.start} onChange={e => { const n=[...eraMarkers]; n[i]={...n[i],start:e.target.value}; saveEraMarkers(n) }}
                  style={{ width:60, fontSize: '0.77em', padding:'3px 5px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:4, color:'var(--tx)' }}
                  placeholder="Start#" />
                <span style={{ fontSize: '0.77em', color:'var(--mut)' }}>–</span>
                <input type="number" value={m.end} onChange={e => { const n=[...eraMarkers]; n[i]={...n[i],end:e.target.value}; saveEraMarkers(n) }}
                  style={{ width:60, fontSize: '0.77em', padding:'3px 5px', background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:4, color:'var(--tx)' }}
                  placeholder="End#" />
                <input type="color" value={m.color||'#4488ff'} onChange={e => { const n=[...eraMarkers]; n[i]={...n[i],color:e.target.value}; saveEraMarkers(n) }}
                  style={{ width:28, height:26, border:'none', borderRadius:4, cursor:'pointer', background:'none' }} />
                <button onClick={() => saveEraMarkers(eraMarkers.filter((_,j) => j!==i))}
                  style={{ background:'none', border:'none', color:'#ff3355', cursor:'pointer', fontSize: '1.08em' }}>✕</button>
              </div>
            ))}
            <button className="btn btn-sm btn-outline" style={{ marginTop:8, color:'var(--cca)', borderColor:'var(--cca)' }}
              onClick={() => saveEraMarkers([...eraMarkers, { name:'New Era', start:'', end:'', color:'#4488ff' }])}>
              + Add Marker
            </button>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEraEditor(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

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
