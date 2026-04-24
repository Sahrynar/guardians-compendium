import { useState, useRef } from 'react'
import Modal from '../components/common/Modal'
import { TAB_RAINBOW, uid } from '../constants'

export default function MapTab({ db }) {
  const tabColor = TAB_RAINBOW['map'] || '#aaaaaa'
  const maps = (db.db.maps || []).slice().sort((a, b) => {
    const ao = a.sort_order != null ? Number(a.sort_order) : 9999
    const bo = b.sort_order != null ? Number(b.sort_order) : 9999
    return ao - bo
  })

  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('mp_cols') || '2'))
  const [dividers, setDividers] = useState(() => db.getSetting?.('mp_cols_div') !== 'off')
  const [mapHeight, setMapHeight] = useState(() => {
    try { return parseInt(localStorage.getItem('map_img_height') || '500') } catch { return 500 }
  })
  const MAP_HEIGHTS = { XS: 200, S: 320, M: 500, L: 700, XL: 900 }
  function saveColCount(n) { setColCount(n); db.saveSetting?.('mp_cols', String(n)) }
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('mp_cols_div', next ? 'on' : 'off') }

  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [addingMap, setAddingMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapNotes, setNewMapNotes] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [editingMap, setEditingMap] = useState(null) // { id, name, notes }

  // ── Drag-to-reorder state ──────────────────────────────────
  const dragId = useRef(null)
  const dragOverId = useRef(null)

  function onDragStart(e, id) {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, id) {
    e.preventDefault()
    dragOverId.current = id
  }

  function onDrop(e) {
    e.preventDefault()
    if (!dragId.current || dragId.current === dragOverId.current) return
    const ordered = [...maps]
    const fromIdx = ordered.findIndex(m => m.id === dragId.current)
    const toIdx = ordered.findIndex(m => m.id === dragOverId.current)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, moved)
    // Persist new sort_order for each map
    ordered.forEach((m, i) => {
      db.upsertEntry('maps', { ...m, sort_order: i })
    })
    dragId.current = null
    dragOverId.current = null
  }

  function onDragEnd() {
    dragId.current = null
    dragOverId.current = null
  }

  function handleUpload(e) {
    const files = Array.from(e.target.files)
    const maxOrder = maps.length ? Math.max(...maps.map(m => m.sort_order ?? 0)) : -1
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = ev => {
        db.upsertEntry('maps', {
          id: uid(), name: newMapName || file.name,
          notes: newMapNotes, src: ev.target.result,
          sort_order: maxOrder + i + 1,
          created: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      reader.readAsDataURL(file)
    })
    setAddingMap(false); setNewMapName(''); setNewMapNotes('')
    e.target.value = ''
  }

  function saveEdit() {
    if (!editingMap) return
    const m = maps.find(x => x.id === editingMap.id)
    if (!m) return
    db.upsertEntry('maps', { ...m, name: editingMap.name, notes: editingMap.notes, updated_at: new Date().toISOString() })
    setEditingMap(null)
  }

  function fmtDate(iso) {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return '' }
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0 6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Columns:</span>
        {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
          <button key={l} onClick={() => saveColCount(n)}
            style={{
              fontSize: 'var(--fs-xs)', padding: '2px 7px', borderRadius: 8,
              background: colCount===n ? tabColor : 'none',
              color: colCount===n ? '#000' : 'var(--dim)',
              border: `1px solid ${colCount===n ? tabColor : 'var(--brd)'}`,
              cursor: 'pointer',
            }}>{l}</button>
        ))}
        <button onClick={toggleDividers}
          style={{
            fontSize: 'var(--fs-xs)', padding: '2px 7px', borderRadius: 8, marginLeft: 8,
            background: dividers ? 'rgba(255,255,255,.08)' : 'none',
            color: dividers ? 'var(--tx)' : 'var(--mut)',
            border: '1px solid var(--brd)', cursor: 'pointer',
          }}>
          {dividers ? '┃ on' : '┃ off'}
        </button>
        <span style={{ marginLeft: 8, fontSize: 'var(--fs-xs)', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Image height:</span>
        {Object.entries(MAP_HEIGHTS).map(([l, h]) => (
          <button key={l} onClick={() => { setMapHeight(h); try { localStorage.setItem('map_img_height', String(h)) } catch {} }}
            style={{ fontSize: 'var(--fs-xs)', padding: '2px 7px', borderRadius: 8,
              background: mapHeight === h ? tabColor : 'none',
              color: mapHeight === h ? '#000' : 'var(--dim)',
              border: `1px solid ${mapHeight === h ? tabColor : 'var(--brd)'}`,
              cursor: 'pointer' }}>{l}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--mut)' }}>
          ☰ Drag cards to reorder
        </span>
      </div>

      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: tabColor }}>🌍 Maps</div>
        <button className="btn btn-primary btn-sm" style={{ background: tabColor, color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
      </div>

      {!maps.length && (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <p>No maps yet. Upload your Lajen/Mnaerah maps here.</p>
          <button className="btn btn-primary" style={{ background: tabColor, color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
        </div>
      )}

      {/* ── Map grid ── */}
      <div style={{
        columns: colCount, columnGap: 12,
      }}>
        {maps.map(m => (
          <div
            key={m.id}
            draggable
            onDragStart={e => onDragStart(e, m.id)}
            onDragOver={e => onDragOver(e, m.id)}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            style={{
              background: 'var(--card)', border: '1px solid var(--brd)',
              borderRadius: 'var(--rl)', overflow: 'hidden',
              breakInside: 'avoid', marginBottom: 12,
              transition: 'box-shadow .15s',
              cursor: 'grab',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 1px ${tabColor}`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {/* Drag handle bar */}
            <div style={{
              display: 'flex', alignItems: 'center', padding: '5px 10px 3px',
              borderBottom: '1px solid var(--brd)', gap: 6,
            }}>
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--dim)', flex: 1, fontFamily: "'Cinzel', serif", fontWeight: 600 }}>{m.name}</span>
            </div>

            <div style={{ position: 'relative' }}>
              <img
                src={m.src} alt={m.name}
                style={{ width: '100%', display: 'block', cursor: 'zoom-in', maxHeight: mapHeight, objectFit: 'contain', background: 'var(--sf)' }}
                onClick={() => setLightboxSrc(m.src)}
              />
            </div>
            <div style={{ padding: '8px 10px' }}>
              {m.notes && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--dim)', marginBottom: 4 }}>{m.notes}</div>}
              {(m.updated_at || m.created) && (
                <div className="entry-timestamp">
                  {m.updated_at && m.updated_at !== m.created ? `Edited ${fmtDate(m.updated_at)}` : `Added ${fmtDate(m.created)}`}
                </div>
              )}
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor }} onClick={() => setLightboxSrc(m.src)}>🔍 Zoom</button>
                <button className="btn btn-sm btn-outline" style={{ color: 'var(--dim)', borderColor: 'var(--brd)' }} onClick={() => setEditingMap({ id: m.id, name: m.name, notes: m.notes || '' })}>✎ Edit</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(m.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Locations reference */}
      {(db.db.locations||[]).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: tabColor, marginBottom: 8 }}>Locations for Reference</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(db.db.locations||[]).map(l => (
              <span key={l.id} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 'var(--fs-xs)', border: `1px solid ${tabColor}44`, color: tabColor, background: `${tabColor}11` }}>{l.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Add map modal ── */}
      <Modal open={addingMap} onClose={() => setAddingMap(false)} title="Add Map" color={tabColor}>
        <div className="field"><label>Map Name</label><input value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="e.g. Lajen World Map" /></div>
        <div className="field"><label>Notes</label><textarea value={newMapNotes} onChange={e => setNewMapNotes(e.target.value)} placeholder="Optional notes about this map…" /></div>
        <div className="field">
          <label>Image File(s)</label>
          <label style={{ display: 'inline-block', padding: '8px 14px', background: tabColor, color: '#000', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600 }}>
            📎 Choose Image(s)
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setAddingMap(false)}>Cancel</button>
        </div>
      </Modal>

      {/* ── Edit map modal ── */}
      <Modal open={!!editingMap} onClose={() => setEditingMap(null)} title="Edit Map" color={tabColor}>
        {editingMap && (
          <>
            <div className="field"><label>Map Name</label><input value={editingMap.name} onChange={e => setEditingMap(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="field"><label>Notes</label><textarea value={editingMap.notes} onChange={e => setEditingMap(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEditingMap(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: tabColor, color: '#000' }} onClick={saveEdit}>Save</button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Map" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '1.85em', cursor: 'pointer' }} onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{maps.find(m=>m.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('maps', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
