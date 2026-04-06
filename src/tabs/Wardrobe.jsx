import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, SL } from '../constants'

const WR_FIELDS = [
  { k: 'name',           l: 'Item',           t: 'text', r: true },
  { k: 'character',      l: 'Character',      t: 'charsel' },
  { k: 'item_type',      l: 'Type',           t: 'sel', o: ['','Clothing','Jewelry','Accessory','Armor','Weapon','Other'] },
  { k: 'description',    l: 'Description',    t: 'ta' },
  { k: 'color_material', l: 'Color/Material', t: 'text' },
  { k: 'books',          l: 'Books',          t: 'booksel' },
  { k: 'status',         l: 'Status',         t: 'statussel' },
  { k: 'notes',          l: 'Notes',          t: 'ta' },
]

const DEFAULT_BUBBLE_COLORS = [
  '#1a4a6b','#4a1a6b','#1a6b4a','#6b4a1a','#6b1a4a',
  '#1a6b6b','#6b1a1a','#4a6b1a','#2a3a5a','#5a2a3a',
]

const TYPE_COLORS = {
  Clothing: 'var(--cl)', Jewelry: 'var(--cca)', Accessory: 'var(--cc)',
  Armor: 'var(--ct)', Weapon: 'var(--ccn)', Other: 'var(--dim)'
}

// ── Compact wardrobe tile (matches Items style) ───────────────────
function WardrobeTile({ item, onOpen, search }) {
  const tc = TYPE_COLORS[item.item_type] || 'var(--dim)'
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        background: 'var(--card)', border: '1px solid var(--brd)',
        borderRadius: 8, padding: '8px 10px', cursor: 'pointer', transition: '.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cwr)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brd)'}
    >
      <div style={{ fontSize: '0.85em', fontWeight: 600, lineHeight: 1.3, color: 'var(--tx)', marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: highlight(item.name || '', search) }} />
      {item.item_type && (
        <div style={{ fontSize: '0.69em', color: tc, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {item.item_type}
        </div>
      )}
      {item.color_material && (
        <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>{item.color_material}</div>
      )}
      {item.status && (
        <div style={{ marginTop: 3 }}>
          <span className={`badge badge-${item.status}`}>{SL[item.status]}</span>
        </div>
      )}
    </div>
  )
}

// ── Wardrobe item popup ───────────────────────────────────────────
function WardrobePopup({ item, color, onClose, onEdit, onDelete }) {
  const tc = color || TYPE_COLORS[item.item_type] || 'var(--cwr)'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--sf)', border: `1px solid ${tc}44`,
        borderRadius: 12, padding: 20, maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: tc, flex: 1 }}>{item.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.38em', color: 'var(--mut)', marginLeft: 10 }}>✕</button>
        </div>
        {item.item_type && <div style={{ marginBottom: 8 }}><div style={{ fontSize: '0.69em', fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Type</div><div style={{ fontSize: '0.92em', color: 'var(--tx)' }}>{item.item_type}</div></div>}
        {item.color_material && <div style={{ marginBottom: 8 }}><div style={{ fontSize: '0.69em', fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Color / Material</div><div style={{ fontSize: '0.92em', color: 'var(--tx)' }}>{item.color_material}</div></div>}
        {item.description && <div style={{ marginBottom: 8 }}><div style={{ fontSize: '0.69em', fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Description</div><div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.6 }}>{item.description}</div></div>}
        {item.notes && <div style={{ marginBottom: 8 }}><div style={{ fontSize: '0.69em', fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Notes</div><div style={{ fontSize: '0.92em', color: 'var(--dim)', lineHeight: 1.6 }}>{item.notes}</div></div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" style={{ color: tc, borderColor: `${tc}44` }}
            onClick={() => { onClose(); onEdit(item) }}>✎ Edit</button>
          <button className="btn btn-outline btn-sm" style={{ color: '#ff3355', borderColor: '#ff335544' }}
            onClick={() => { onClose(); onDelete(item.id) }}>✕ Delete</button>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Character bubble ──────────────────────────────────────────────
function WardrobeBubble({ char, items, color, onColorChange, onDragStart, onDragOver, onDrop, dragging, search, onOpenItem }) {
  const name = char === '__unassigned__' ? 'Unassigned' : (char.name || 'Unknown')
  const bubbleColor = color || '#4a1a6b'
  const [showPicker, setShowPicker] = useState(false)

  const PRESET_COLORS = [
    '#4a1a6b','#6b1a4a','#1a4a6b','#6b4a1a','#1a6b4a',
    '#8e44ad','#e91e63','#2980b9','#27ae60','#f39c12',
    '#c0392b','#1a6b6b','#5a3a1a','#3a1a5a','#6b1a1a',
    '#2c3e50','#16a085','#d35400','#7f8c8d','#e74c3c',
  ]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={onDrop}
      style={{
        border: `2px solid ${bubbleColor}`,
        borderRadius: 12,
        background: `${bubbleColor}18`,
        padding: 12,
        opacity: dragging ? 0.4 : 1,
        transition: '.15s',
        cursor: 'grab',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {char !== '__unassigned__' && char.reference_image && (
          <img src={char.reference_image} alt={name}
            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bubbleColor}` }}
            onError={e => e.target.style.display = 'none'} />
        )}
        <div style={{ flex: 1, fontFamily: "'Cinzel',serif", fontSize: '0.92em', fontWeight: 700, color: bubbleColor }}>{name}</div>
        <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
        <div style={{ position: 'relative' }}>
          <button onClick={e => { e.stopPropagation(); setShowPicker(p => !p) }}
            title="Change bubble colour"
            style={{ width: 18, height: 18, borderRadius: '50%', background: bubbleColor,
              border: '2px solid rgba(255,255,255,.3)', cursor: 'pointer', flexShrink: 0 }} />
          {showPicker && (
            <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 100,
              background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 10,
              padding: 10, width: 160, boxShadow: '0 4px 20px rgba(0,0,0,.5)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Bubble Colour</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => { onColorChange(c); setShowPicker(false) }}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c,
                      border: c === bubbleColor ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <input type="color" value={bubbleColor} onChange={e => onColorChange(e.target.value)}
                style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
              <button onClick={() => setShowPicker(false)}
                style={{ marginTop: 6, width: '100%', fontSize: '0.77em', padding: '3px 0',
                  background: 'none', border: '1px solid var(--brd)', borderRadius: 6,
                  color: 'var(--mut)', cursor: 'pointer' }}>Done</button>
            </div>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '0.77em', color: 'var(--mut)', padding: '8px 0', textAlign: 'center' }}>No wardrobe items</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
          {items.map(item => (
            <WardrobeTile key={item.id} item={item} search={search} onOpen={onOpenItem} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Wardrobe({ db }) {
  const items = db.db.wardrobe || []
  const chars = db.db.characters || []
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const filtered = search
    ? items.filter(it => JSON.stringify(it).toLowerCase().includes(search.toLowerCase()))
    : items

  function charName(id) {
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : 'Unassigned'
  }

  function handleSave(entry) {
    db.upsertEntry('wardrobe', entry)
    setModalOpen(false); setEditing(null)
  }

  function handleBubbleColor(charId, color) {
    const char = chars.find(c => c.id === charId)
    if (char) db.upsertEntry('characters', { ...char, bubble_color: color })
  }

  function handleDrop(fromIdx, toIdx) {
    if (fromIdx === null || fromIdx === toIdx) return
    const newOrder = [...holderOrder]
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    newOrder.forEach((holderId, idx) => {
      if (holderId === '__unassigned__') return
      const char = chars.find(c => c.id === holderId)
      if (char) db.upsertEntry('characters', { ...char, bubble_order: String(idx + 1) })
    })
    setDragIdx(null); setDragOverIdx(null)
  }

  // Group by character
  const byChar = {}
  filtered.forEach(it => {
    const k = it.character || '__unassigned__'
    if (!byChar[k]) byChar[k] = []
    byChar[k].push(it)
  })

  const holderOrder = chars
    .filter(c => byChar[c.id])
    .sort((a, b) => {
      const ao = parseFloat(a.bubble_order) || 999
      const bo = parseFloat(b.bubble_order) || 999
      return ao !== bo ? ao - bo : (a.name || '').localeCompare(b.name || '')
    })
    .map(c => c.id)
  if (byChar['__unassigned__']) holderOrder.push('__unassigned__')

  return (
    <div>
      <div className="tbar">
        <input className="sx" placeholder="Search wardrobe…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cwr)', color: '#000' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {holderOrder.length === 0 && (
        <div className="empty"><div className="empty-icon">👗</div><p>No wardrobe items yet.</p></div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {holderOrder.map((holderId, idx) => {
          const char = holderId === '__unassigned__' ? null : chars.find(c => c.id === holderId)
          const stableIdx = holderId === '__unassigned__' ? 0 : Math.abs(holderId.split('').reduce((a,c) => a+c.charCodeAt(0),0))
            const bubbleColor = char?.bubble_color || DEFAULT_BUBBLE_COLORS[stableIdx % DEFAULT_BUBBLE_COLORS.length]
          return (
            <WardrobeBubble
              key={holderId}
              char={holderId === '__unassigned__' ? '__unassigned__' : (char || { name: holderId })}
              items={byChar[holderId] || []}
              color={bubbleColor}
              search={search}
              dragging={dragIdx === idx}
              onColorChange={color => holderId !== '__unassigned__' && handleBubbleColor(holderId, color)}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={() => setDragOverIdx(idx)}
              onDrop={() => handleDrop(dragIdx, dragOverIdx)}
              onOpenItem={item => setViewPopup({ item, color: char?.bubble_color || DEFAULT_BUBBLE_COLORS[stableIdx % DEFAULT_BUBBLE_COLORS.length] })}
            />
          )
        })}
      </div>

      {viewPopup && (
        <WardrobePopup
          item={viewPopup.item}
          color={viewPopup.color}
          onClose={() => setViewPopup(null)}
          onEdit={item => { setEditing(item); setModalOpen(true) }}
          onDelete={id => { setConfirmId(id); setViewPopup(null) }}
        />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id ? 'Edit' : 'Add'} Wardrobe Item`} color="var(--cwr)">
        <EntryForm fields={WR_FIELDS} entry={editing || {}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--cwr)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{items.find(e => e.id === confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('wardrobe', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
