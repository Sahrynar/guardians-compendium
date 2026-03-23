import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { uid } from '../constants'

const LOC_FIELDS = [
  { k: 'name',        l: 'Name',            t: 'text', r: true },
  { k: 'loc_type',    l: 'Type',            t: 'sel', o: ['','World','Continent','Country','City/Town','Building','Room/Area','Landmark','Island','Body of Water','Portal','Other'] },
  { k: 'parent_id',   l: 'Inside / Part of',t: 'locsel' },
  { k: 'description', l: 'Description',     t: 'ta' },
]

function locPath(id, locations) {
  const parts = []
  let cur = locations.find(l => l.id === id)
  while (cur) { parts.unshift(cur.name); cur = cur.parent_id ? locations.find(l => l.id === cur.parent_id) : null }
  return parts.join(' → ')
}

function LocNode({ loc, locations, expanded, onToggle, onEdit, onDelete, onAddChild }) {
  const kids = locations.filter(l => l.parent_id === loc.id)
  const isOpen = expanded.has(loc.id)
  return (
    <div style={{ marginBottom: 2 }}>
      <div className="loc-node" onClick={() => onToggle(loc.id)}>
        {kids.length > 0
          ? <span style={{ fontSize: 9, color: 'var(--cl)', transition: '.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>►</span>
          : <span style={{ width: 12 }} />
        }
        <span style={{ fontSize: 12, fontWeight: 600 }}>{loc.name}</span>
        {loc.status && <span className={`badge badge-${loc.status}`} style={{ marginLeft: 4 }}>{loc.status}</span>}
        <span style={{ fontSize: 9, color: 'var(--mut)', marginLeft: 'auto' }}>{loc.loc_type || ''}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '6px 8px 6px 24px', fontSize: 11, color: 'var(--dim)' }}>
          {loc.description && <div>{loc.description}</div>}
          {loc.notes && <div className="entry-notes">{loc.notes}</div>}
          <div className="entry-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-sm btn-outline" style={{ color: 'var(--cl)', borderColor: 'var(--cl)' }} onClick={e => { e.stopPropagation(); onEdit(loc) }}>✎</button>
            <button className="btn btn-sm btn-outline" style={{ color: 'var(--cl)', borderColor: 'var(--cl)' }} onClick={e => { e.stopPropagation(); onAddChild(loc.id) }}>+ Child</button>
            <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={e => { e.stopPropagation(); onDelete(loc.id) }}>✕</button>
          </div>
        </div>
      )}
      {isOpen && kids.length > 0 && (
        <div className="loc-children">
          {kids.map(k => (
            <LocNode key={k.id} loc={k} locations={locations} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Locations({ db }) {
  const locations = db.db.locations || []
  const [expanded, setExpanded] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  function toggle(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function openAdd(parentId) {
    setEditing(parentId ? { parent_id: parentId } : {})
    setModalOpen(true)
  }

  function handleSave(entry) {
    db.upsertEntry('locations', entry)
    setModalOpen(false); setEditing(null)
  }

  function handleDelete(id) {
    db.deleteEntry('locations', id)
    // Orphan children
    ;(db.db.locations || []).filter(l => l.parent_id === id).forEach(l => {
      db.upsertEntry('locations', { ...l, parent_id: '' })
    })
    setConfirmId(null)
  }

  const roots = locations.filter(l => !l.parent_id)

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cl)' }}>🗺 Locations</div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cl)', color: '#000' }} onClick={() => openAdd()}>+ Add</button>
      </div>

      {!locations.length && (
        <div className="empty"><div className="empty-icon">🗺</div><p>No locations yet.</p></div>
      )}

      {roots.map(l => (
        <LocNode key={l.id} loc={l} locations={locations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />
      ))}
      {/* Orphans */}
      {locations.filter(l => l.parent_id && !locations.find(p => p.id === l.parent_id)).map(l => (
        <LocNode key={l.id} loc={l} locations={locations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />
      ))}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id ? 'Edit' : 'Add'} Location`} color="var(--cl)">
        <EntryForm fields={LOC_FIELDS} entry={editing || {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--cl)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{locations.find(l=>l.id===confirmId)?.name}</strong>?<br /><span style={{fontSize:10,color:'var(--mut)'}}>Children will be detached, not deleted.</span></p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
