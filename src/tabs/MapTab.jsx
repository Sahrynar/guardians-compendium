import { useState, useRef, useEffect } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

const TAB_COLOR = '#ffd600' // Yellow

export default function MapTab({ db, navSearch }) {
  const maps = db.db.maps || []
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [addingMap, setAddingMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapNotes, setNewMapNotes] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [imgHeights, setImgHeights] = useState({}) // per-map height override
  const [dragOver, setDragOver] = useState(null)

  // Load saved order from db settings
  useEffect(() => {
    if (!db.loading && db.settings?.maps_order && order === null) {
      try { setOrder(JSON.parse(db.settings.maps_order)) } catch {}
    }
  }, [db.loading])
  const [order, setOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('maps_order_local')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const search = (navSearch || '').toLowerCase()

  function handleUpload(e) {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        db.upsertEntry('maps', {
          id: uid(), name: newMapName || file.name,
          notes: newMapNotes, src: ev.target.result,
          created: new Date().toISOString()
        })
      }
      reader.readAsDataURL(file)
    })
    setAddingMap(false); setNewMapName(''); setNewMapNotes('')
    e.target.value = ''
  }

  // Drag to reorder
  const dragIdx = useRef(null)

  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, idx) {
    e.preventDefault()
    setDragOver(idx)
  }
  function onDrop(e, idx) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) { setDragOver(null); return }
    const currentOrder = order || maps.map(m => m.id)
    const next = [...currentOrder]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    setOrder(next)
    // Persist order
    if (db.saveSetting) db.saveSetting('maps_order', JSON.stringify(next))
    dragIdx.current = null
    setDragOver(null)
  }
  function onDragEnd() { dragIdx.current = null; setDragOver(null) }

  // Resize handle
  function startResize(e, mapId, currentH) {
    e.preventDefault()
    const startY = e.clientY
    const startH = currentH || 300
    function onMove(ev) {
      const delta = ev.clientY - startY
      setImgHeights(prev => ({ ...prev, [mapId]: Math.max(80, startH + delta) }))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Apply order and search
  const orderedMaps = order
    ? order.map(id => maps.find(m => m.id === id)).filter(Boolean)
    : [...maps]
  const visibleMaps = search
    ? orderedMaps.filter(m => m.name?.toLowerCase().includes(search) || m.notes?.toLowerCase().includes(search))
    : orderedMaps

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: TAB_COLOR }}>🌍 Maps</div>
        <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>Drag to reorder · Drag bottom edge to resize</div>
        <button className="btn btn-primary btn-sm" style={{ background: TAB_COLOR, color: '#000' }}
          onClick={() => setAddingMap(true)}>+ Add Map</button>
      </div>

      {!maps.length && (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <p>No maps yet. Upload your Lajen/Mnaerah maps here.</p>
          <button className="btn btn-primary" style={{ background: TAB_COLOR, color: '#000' }}
            onClick={() => setAddingMap(true)}>+ Add Map</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {visibleMaps.map((m, idx) => {
          const h = imgHeights[m.id] || 300
          return (
            <div key={m.id}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              style={{
                background: 'var(--card)', border: `1px solid ${dragOver === idx ? TAB_COLOR : 'var(--brd)'}`,
                borderRadius: 'var(--rl)', overflow: 'hidden', cursor: 'grab',
                transition: 'border-color .15s',
              }}>
              {/* Map image with resize handle */}
              <div style={{ position: 'relative', height: h, overflow: 'hidden', background: 'var(--sf)' }}>
                <img
                  src={m.src} alt={m.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                  onClick={() => setLightboxSrc(m.src)}
                  draggable={false}
                />
                {/* Resize handle at bottom */}
                <div
                  onMouseDown={e => startResize(e, m.id, h)}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
                    cursor: 'ns-resize', background: `${TAB_COLOR}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 30, height: 2, borderRadius: 1, background: TAB_COLOR, opacity: 0.6 }} />
                </div>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', fontWeight: 600, color: TAB_COLOR }}>{m.name}</div>
                {m.notes && <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 3 }}>{m.notes}</div>}
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-outline" style={{ color: TAB_COLOR, borderColor: TAB_COLOR }}
                    onClick={() => setLightboxSrc(m.src)}>🔍 Zoom</button>
                  <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
                    onClick={() => setConfirmId(m.id)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Locations reference */}
      {(db.db.locations || []).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: TAB_COLOR, marginBottom: 8 }}>Locations for Reference</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(db.db.locations || []).map(l => (
              <span key={l.id} style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.77em',
                border: `1px solid ${TAB_COLOR}44`, color: TAB_COLOR, background: TAB_COLOR + '11' }}>{l.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Add map modal */}
      <Modal open={addingMap} onClose={() => setAddingMap(false)} title="Add Map" color={TAB_COLOR}>
        <div className="field"><label>Map Name</label><input value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="e.g. Lajen World Map" /></div>
        <div className="field"><label>Notes</label><textarea value={newMapNotes} onChange={e => setNewMapNotes(e.target.value)} placeholder="Optional notes…" /></div>
        <div className="field">
          <label>Image File(s)</label>
          <label style={{ display: 'inline-block', padding: '8px 14px', background: TAB_COLOR, color: '#000', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600 }}>
            📎 Choose Image(s)
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setAddingMap(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Map" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '1.85em', cursor: 'pointer' }}
            onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{maps.find(m => m.id === confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('maps', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
