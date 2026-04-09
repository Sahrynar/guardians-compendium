import { useState } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

export default function MapTab({ db }) {
  const maps = db.db.maps || []
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [addingMap, setAddingMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapNotes, setNewMapNotes] = useState('')
  const [confirmId, setConfirmId] = useState(null)

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

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: '#ffd600' }}>🌍 Maps</div>
        <button className="btn btn-primary btn-sm" style={{ background: '#ffd600', color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
      </div>

      {!maps.length && (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <p>No maps yet. Upload your Lajen/Mnaerah maps here.</p>
          <button className="btn btn-primary" style={{ background: '#ffd600', color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {maps.map(m => (
          <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={m.src} alt={m.name}
                style={{ width: '100%', display: 'block', cursor: 'zoom-in', maxHeight: 300, objectFit: 'contain', background: 'var(--sf)' }}
                onClick={() => setLightboxSrc(m.src)}
              />
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.92em', fontWeight: 600 }}>{m.name}</div>
              {m.notes && <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 3 }}>{m.notes}</div>}
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-outline" style={{ color: '#ffd600', borderColor: '#ffd600' }} onClick={() => setLightboxSrc(m.src)}>🔍 Zoom</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(m.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Locations reference */}
      {(db.db.locations||[]).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: '#ffd600', marginBottom: 8 }}>Locations for Reference</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(db.db.locations||[]).map(l => (
              <span key={l.id} style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.77em', border: '1px solid rgba(0,229,204,.3)', color: '#ffd600', background: 'rgba(0,229,204,.05)' }}>{l.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Add map modal */}
      <Modal open={addingMap} onClose={() => setAddingMap(false)} title="Add Map" color="var(--cl)">
        <div className="field"><label>Map Name</label><input value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="e.g. Lajen World Map" /></div>
        <div className="field"><label>Notes</label><textarea value={newMapNotes} onChange={e => setNewMapNotes(e.target.value)} placeholder="Optional notes about this map…" /></div>
        <div className="field">
          <label>Image File(s)</label>
          <label style={{ display: 'inline-block', padding: '8px 14px', background: '#ffd600', color: '#000', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600 }}>
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
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Map" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '1.85em', cursor: 'pointer' }} onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}

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
