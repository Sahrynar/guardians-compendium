import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight } from '../constants'

const WR_FIELDS = [
  { k: 'name',           l: 'Item',           t: 'text', r: true },
  { k: 'character',      l: 'Character',      t: 'charsel' },
  { k: 'item_type',      l: 'Type',           t: 'sel', o: ['','Clothing','Jewelry','Accessory','Armor','Weapon','Other'] },
  { k: 'description',    l: 'Description',    t: 'ta' },
  { k: 'color_material', l: 'Color/Material', t: 'text' },
]

export default function Wardrobe({ db }) {
  const items = db.db.wardrobe || []
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const filtered = search
    ? items.filter(it => JSON.stringify(it).toLowerCase().includes(search.toLowerCase()))
    : items

  function charName(id) {
    const ch = (db.db.characters || []).find(c => c.id === id)
    return ch ? ch.name : 'Unassigned'
  }

  function handleSave(entry) {
    db.upsertEntry('wardrobe', entry)
    setModalOpen(false); setEditing(null)
  }

  // Group by character
  const byChar = {}
  filtered.forEach(it => {
    const k = it.character || '_'
    if (!byChar[k]) byChar[k] = []
    byChar[k].push(it)
  })

  const typeColors = {
    Clothing: 'var(--cl)', Jewelry: 'var(--cca)', Accessory: 'var(--cc)',
    Armor: 'var(--ct)', Weapon: 'var(--ccn)', Other: 'var(--dim)'
  }

  return (
    <div>
      <div className="tbar">
        <input className="sx" placeholder="Search wardrobe…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm" style={{ background: '#4361ee', color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {!filtered.length && (
        <div className="empty"><div className="empty-icon">👗</div><p>No wardrobe items yet.</p></div>
      )}

      {Object.entries(byChar).map(([cid, citems]) => (
        <div key={cid} className="wardrobe-card">
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: '#4361ee', marginBottom: 6 }}>
            {charName(cid)}
          </div>
          {citems.map(it => {
            const isOpen = expanded === it.id
            const tc = typeColors[it.item_type] || 'var(--dim)'
            return (
              <span
                key={it.id}
                className="wardrobe-item"
                onClick={() => setExpanded(isOpen ? null : it.id)}
              >
                {it.item_type && <span style={{ fontSize: 7, color: tc, textTransform: 'uppercase', letterSpacing: '.03em' }}>{it.item_type} </span>}
                <span dangerouslySetInnerHTML={{ __html: highlight(it.name || '', search) }} />
                <span
                  style={{ fontSize: 8, marginLeft: 4, color: 'var(--dim)' }}
                  onClick={e => { e.stopPropagation(); setEditing(it); setModalOpen(true) }}
                >✎</span>
              </span>
            )
          })}
          {citems.filter(it => expanded === it.id).map(it => (
            <div key={`detail-${it.id}`} style={{ marginTop: 8, padding: '8px', background: 'rgba(255,255,255,.02)', borderRadius: 'var(--r)', fontSize: '0.85em', color: 'var(--dim)' }}>
              {it.description && <div style={{ marginBottom: 4 }}>{it.description}</div>}
              {it.color_material && <div><strong style={{ color: '#4361ee', fontSize: '0.69em', textTransform: 'uppercase' }}>Material: </strong>{it.color_material}</div>}
              {it.notes && <div className="entry-notes" style={{ marginTop: 4 }}>{it.notes}</div>}
              <div className="entry-actions" style={{ marginTop: 4 }}>
                <button className="btn btn-sm btn-outline" style={{ color: '#4361ee', borderColor: '#4361ee' }} onClick={() => { setEditing(it); setModalOpen(true) }}>✎ Edit</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(it.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id ? 'Edit' : 'Add'} Wardrobe Item`} color="var(--cwr)">
        <EntryForm fields={WR_FIELDS} entry={editing || {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--cwr)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{items.find(e=>e.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('wardrobe', confirmId); setConfirmId(null); if (expanded === confirmId) setExpanded(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
