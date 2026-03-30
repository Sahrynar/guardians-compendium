import { useState } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

export default function MapTab({ db }) {
  const maps = db.db.maps || []
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('mp_cols') || '2'))
  const [dividers, setDividers] = useState(() => db.getSetting?.('mp_cols_div') !== 'off')
  function saveColCount(n) { setColCount(n); db.saveSetting?.('mp_cols', String(n)) }
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('mp_cols_div', next ? 'on' : 'off') }
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
      <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0 6px', flexWrap:'wrap' }}>
        <span style={{ fontSize:9, color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.05em' }}>Columns:</span>
        {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
          <button key={l} onClick={() => saveColCount(n)}
            style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
              background: colCount===n ? 'var(--cm)' : 'none',
              color: colCount===n ? '#000' : 'var(--dim)',
              border: `1px solid ${colCount===n ? 'var(--cm)' : 'var(--brd)'}`,
              cursor:'pointer' }}>{l}</button>
        ))}
        <button onClick={toggleDividers}
          style={{ fontSize:9, padding:'2px 7px', borderRadius:8, marginLeft:8,
            background: dividers ? 'rgba(255,255,255,.08)' : 'none',
            color: dividers ? 'var(--tx)' : 'var(--mut)',
            border:'1px solid var(--brd)', cursor:'pointer' }}>
          {dividers ? '┃ on' : '┃ off'}
        </button>
      </div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cl)' }}>🌍 Maps</div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cl)', color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
      </div>

      {!maps.length && (
        <div className="empty">
          <div className="empty-icon">🌍</div>
          <p>No maps yet. Upload your Lajen/Mnaerah maps here.</p>
          <button className="btn btn-primary" style={{ background: 'var(--cl)', color: '#000' }} onClick={() => setAddingMap(true)}>+ Add Map</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {maps.map(m => (
          <div key={m.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', overflow: 'hidden', breakInside: 'avoid', marginBottom: 12 }}>
            <div style={{ position: 'relative' }}>
              <img
                src={m.src} alt={m.name}
                style={{ width: '100%', display: 'block', cursor: 'zoom-in', maxHeight: 300, objectFit: 'contain', background: 'var(--sf)' }}
                onClick={() => setLightboxSrc(m.src)}
              />
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 600 }}>{m.name}</div>
              {m.notes && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>{m.notes}</div>}
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-outline" style={{ color: 'var(--cl)', borderColor: 'var(--cl)' }} onClick={() => setLightboxSrc(m.src)}>🔍 Zoom</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(m.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Locations reference */}
      {(db.db.locations||[]).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: 'var(--cl)', marginBottom: 8 }}>Locations for Reference</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {(db.db.locations||[]).map(l => (
              <span key={l.id} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, border: '1px solid rgba(0,229,204,.3)', color: 'var(--cl)', background: 'rgba(0,229,204,.05)' }}>{l.name}</span>
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
          <label style={{ display: 'inline-block', padding: '8px 14px', background: 'var(--cl)', color: '#000', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
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
          <button style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }} onClick={() => setLightboxSrc(null)}>✕</button>
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
