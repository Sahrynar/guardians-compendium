import { useState, useRef, useCallback } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, uid, SL } from '../constants'
import Lightbox from '../components/common/Lightbox'
import ImagePicker from '../components/common/ImagePicker'
import { uploadImage } from '../hooks/useImageUpload'

const ITEM_FIELDS = [
  { k: 'name',         l: 'Name',           t: 'text', r: true },
  { k: 'item_type',    l: 'Type',           t: 'text', p: 'e.g. weapon, jewellery, book' },
  { k: 'holder',       l: 'Current Holder', t: 'charsel' },
  { k: 'shared_with',  l: 'Shared With',    t: 'charsel', p: 'If item passes freely between two people' },
  { k: 'origin',       l: 'Origin',         t: 'text' },
  { k: 'image',        l: 'Image URL',      t: 'text', p: 'Paste image URL or leave blank' },
  { k: 'significance', l: 'Significance',   t: 'ta' },
  { k: 'detail',       l: 'Detail',         t: 'ta' },
]

const DEFAULT_BUBBLE_COLORS = [
  '#1a4a6b','#4a1a6b','#1a6b4a','#6b4a1a','#6b1a4a',
  '#1a6b6b','#6b1a1a','#4a6b1a','#2a3a5a','#5a2a3a',
]

// ── Compact item tile ─────────────────────────────────────────────
function ItemTile({ item, onOpen, search }) {
  const hasTransfers = (item.transfers || []).length > 0
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        background: 'var(--card)', border: '1px solid var(--brd)',
        borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
        position: 'relative', transition: '.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ci)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brd)'}
    >
      {item.image && (
        <img src={item.image} alt={item.name}
          style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}
          onError={e => e.target.style.display = 'none'} />
      )}
      {hasTransfers && (
        <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9,
          background: 'rgba(255,170,51,.2)', color: 'var(--sp)',
          border: '1px solid rgba(255,170,51,.3)', borderRadius: 4, padding: '1px 4px' }}>↔</span>
      )}
      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'var(--tx)', marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: highlight(item.name || '', search) }} />
      {item.item_type && (
        <div style={{ fontSize: 9, color: 'var(--ci)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {item.item_type}
        </div>
      )}
      {item.status && (
        <div style={{ marginTop: 3 }}>
          <span className={`badge badge-${item.status}`}>{SL[item.status]}</span>
        </div>
      )}
    </div>
  )
}

// ── Character bubble ──────────────────────────────────────────────
function CharBubble({ char, items, color, onColorChange, onDragStart, onDragOver, onDrop, dragging, search, onOpenItem, cols }) {
  const name = char === '__unassigned__' ? 'Unassigned' : (char.name || 'Unknown')
  const bubbleColor = color || '#1a4a6b'
  const [showPicker, setShowPicker] = useState(false)

  const PRESET_COLORS = [
    '#1a4a6b','#6b1a4a','#1a6b4a','#6b4a1a','#4a1a6b',
    '#1a6b6b','#6b1a1a','#2a4a2a','#5a3a1a','#3a1a5a',
    '#c0392b','#8e44ad','#2980b9','#27ae60','#f39c12',
    '#2c3e50','#16a085','#d35400','#7f8c8d','#e91e63',
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
      {/* Bubble header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {char.reference_image && (
          <img src={char.reference_image} alt={name}
            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bubbleColor}` }}
            onError={e => e.target.style.display = 'none'} />
        )}
        <div style={{ flex: 1, fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, color: bubbleColor }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--mut)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
        {/* Color picker button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowPicker(p => !p) }}
            title="Change bubble colour"
            style={{ width: 18, height: 18, borderRadius: '50%', background: bubbleColor,
              border: '2px solid rgba(255,255,255,.3)', cursor: 'pointer', flexShrink: 0 }}
          />
          {showPicker && (
            <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 100,
              background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 10,
              padding: 10, width: 160, boxShadow: '0 4px 20px rgba(0,0,0,.5)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 9, color: 'var(--mut)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Bubble Colour</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => { onColorChange(c); setShowPicker(false) }}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c,
                      border: c === bubbleColor ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer' }} />
                ))}
              </div>
              <input type="color" value={bubbleColor}
                onChange={e => onColorChange(e.target.value)}
                style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
              <button onClick={() => setShowPicker(false)}
                style={{ marginTop: 6, width: '100%', fontSize: 10, padding: '3px 0',
                  background: 'none', border: '1px solid var(--brd)', borderRadius: 6,
                  color: 'var(--mut)', cursor: 'pointer' }}>Done</button>
            </div>
          )}
        </div>
      </div>

      {/* Items grid inside bubble */}
      {items.length === 0 ? (
        <div style={{ fontSize: 10, color: 'var(--mut)', padding: '8px 0', textAlign: 'center' }}>No items</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 6 }}>
          {items.map(item => (
            <ItemTile key={item.id} item={item} search={search} onOpen={onOpenItem} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Full item popup ───────────────────────────────────────────────
function ItemPopup({ item, items, chars, db, onClose, onEdit, onTransfer, setLightbox, setPickerForItem, uploadingImg, handleImageUpload, color }) {
  const tc = color || 'var(--ci)'
  function holderName(id) {
    if (!id) return 'Unassigned'
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : id
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--sf)', border: `1px solid ${tc}44`,
        borderRadius: 12, padding: 20, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: tc, flex: 1 }}>{item.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--mut)', marginLeft: 10 }}>✕</button>
        </div>
        {/* Image */}
        <div style={{ marginBottom: 14 }}>
          {item.image ? (
            <img src={item.image} alt={item.name}
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, background: 'var(--card)', cursor: 'pointer', display: 'block' }}
              onClick={() => setLightbox(item.image)}
              onError={e => e.target.style.display = 'none'} />
          ) : (
            <div style={{ width: '100%', height: 60, border: '1px dashed var(--brd)', borderRadius: 8,
              background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--mut)', fontSize: 11 }}>No image</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', fontSize: 10 }}>
              {uploadingImg === item.id ? 'Uploading…' : '⬆ Upload'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) handleImageUpload(item.id, f); e.target.value = '' }} />
            </label>
            <button className="btn btn-sm btn-outline" style={{ fontSize: 10 }}
              onClick={() => { onClose(); setPickerForItem(item.id) }}>🖼 Browse Library</button>
            {item.image && (
              <button className="btn btn-sm btn-outline" style={{ fontSize: 10, color: '#ff3355', borderColor: '#ff335544' }}
                onClick={() => { const it = items.find(x => x.id === item.id); if (it) db.upsertEntry('items', { ...it, image: null }) }}>Remove</button>
            )}
          </div>
        </div>
        {[['Type', item.item_type], ['Holder', holderName(item.holder)],
          ['Shared With', item.shared_with ? holderName(item.shared_with) : null],
          ['Origin', item.origin], ['Status', item.status ? SL[item.status] : null],
          ['Books', (item.books || []).join(', ')],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>{val}</div>
          </div>
        ))}
        {item.significance && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Significance</div><div style={{ fontSize: 12, color: 'var(--tx)', lineHeight: 1.6 }}>{item.significance}</div></div>}
        {item.detail && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Detail</div><div style={{ fontSize: 12, color: 'var(--tx)', lineHeight: 1.6 }}>{item.detail}</div></div>}
        {(item.transfers || []).length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--brd)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--sp)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>↔ Transfer History</div>
            {item.transfers.map((t, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 3 }}>
                {t.from || '?'} → {t.to || '?'}{t.note ? ` · ${t.note}` : ''}{t.when ? <span style={{ color: 'var(--mut)' }}> ({t.when})</span> : ''}
              </div>
            ))}
          </div>
        )}
        {item.notes && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--brd)', fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>{item.notes}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" style={{ color: tc, borderColor: 'var(--ci)44' }}
            onClick={() => { onClose(); onEdit(item) }}>✎ Edit</button>
          <button className="btn btn-outline btn-sm" style={{ color: tc, borderColor: 'var(--ci)44' }}
            onClick={() => { onClose(); onTransfer(item.id) }}>↔ Transfer</button>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

const SIZE_COLS = { XS: 5, S: 4, M: 3, L: 2, XL: 1 }

export default function Items({ db }) {
  const items = db.db.items || []
  const chars = db.db.characters || []
  const [search, setSearch] = useState('')
  const [colSize, setColSize] = useState(() => {
    try { return localStorage.getItem('colsize_items') || 'M' } catch { return 'M' }
  })
  const cols = SIZE_COLS[colSize] || 3
  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_items', sz) } catch {} }
  const [viewMode, setViewMode] = useState('holder')
  const [expanded, setExpanded] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [transferId, setTransferId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [txForm, setTxForm] = useState({ to: '', note: '', when: '' })
  const [uploadingImg, setUploadingImg] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [pickerForItem, setPickerForItem] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  function holderName(id) {
    if (!id) return 'Unassigned'
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : id
  }

  async function handleImageUpload(itemId, file) {
    setUploadingImg(itemId)
    const { url, error } = await uploadImage(file, 'items')
    if (url) {
      const item = items.find(x => x.id === itemId)
      if (item) db.upsertEntry('items', { ...item, image: url })
    } else { alert(error || 'Upload failed') }
    setUploadingImg(null)
  }

  function handleSave(entry) {
    if (!editing?.id) {
      const newName = (entry.name || '').toLowerCase().trim()
      const dupe = items.find(i => i.id !== entry.id && (i.name || '').toLowerCase().trim() === newName)
      if (dupe && !window.confirm(`An item named "${dupe.name}" already exists. Save anyway?`)) return
    }
    const stamped = { ...entry, updated_at: new Date().toISOString() }
    if (!editing?.id) stamped.created = stamped.created || stamped.updated_at
    db.upsertEntry('items', stamped)
    setModalOpen(false); setEditing(null)
  }

  function doTransfer() {
    const item = items.find(x => x.id === transferId)
    if (!item || !txForm.to) return
    const transfers = [...(item.transfers || []), { from: holderName(item.holder), to: txForm.to, note: txForm.note, when: txForm.when }]
    const toChar = chars.find(c => c.name === txForm.to || c.id === txForm.to)
    db.upsertEntry('items', { ...item, holder: toChar ? toChar.id : txForm.to, transfers })
    setTransferId(null); setTxForm({ to: '', note: '', when: '' })
  }

  function handleBubbleColor(charId, color) {
    const char = chars.find(c => c.id === charId)
    if (char) db.upsertEntry('characters', { ...char, bubble_color: color })
  }

  function handleDrop(fromIdx, toIdx) {
    if (fromIdx === null || fromIdx === toIdx) return
    // Reorder by updating bubble_order on affected characters
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

  const filtered = items.filter(e => !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase()))

  // Group by holder
  const grouped = {}
  filtered.forEach(item => {
    const key = item.holder || '__unassigned__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  })

  // Sort holders by bubble_order, then alphabetically
  const holderOrder = chars
    .filter(c => grouped[c.id])
    .sort((a, b) => {
      const ao = parseFloat(a.bubble_order) || 999
      const bo = parseFloat(b.bubble_order) || 999
      return ao !== bo ? ao - bo : (a.name || '').localeCompare(b.name || '')
    })
    .map(c => c.id)
  if (grouped['__unassigned__']) holderOrder.push('__unassigned__')

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3 }}>
          {['XS','S','M','L','XL'].map(sz => (
            <button key={sz} onClick={() => changeColSize(sz)}
              style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
                background: colSize === sz ? '#7b2d8b' : 'none',
                color: colSize === sz ? '#fff' : 'var(--dim)',
                border: `1px solid ${colSize === sz ? '#7b2d8b' : 'var(--brd)'}` }}>{sz}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm btn-outline ${viewMode === 'holder' ? 'active' : ''}`}
            style={{ fontSize: 10 }} onClick={() => setViewMode('holder')}>By Holder</button>
          <button className={`btn btn-sm btn-outline ${viewMode === 'list' ? 'active' : ''}`}
            style={{ fontSize: 10 }} onClick={() => setViewMode('list')}>List</button>
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--ci)' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Bubble view */}
      {viewMode === 'holder' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 10 }}>
          {holderOrder.length === 0 && (
            <div className="empty"><div className="empty-icon">⚔</div><p>No items yet.</p></div>
          )}
          {holderOrder.map((holderId, idx) => {
            const char = holderId === '__unassigned__' ? null : chars.find(c => c.id === holderId)
            const stableIdx = holderId === '__unassigned__' ? 0 : Math.abs(holderId.split('').reduce((a,c) => a+c.charCodeAt(0),0))
            const bubbleColor = char?.bubble_color || DEFAULT_BUBBLE_COLORS[stableIdx % DEFAULT_BUBBLE_COLORS.length]
            return (
              <CharBubble
                key={holderId}
                char={holderId === '__unassigned__' ? '__unassigned__' : (char || { name: holderId })}
                items={grouped[holderId] || []}
                color={bubbleColor}
                search={search}
                dragging={dragIdx === idx}
                onColorChange={color => holderId !== '__unassigned__' && handleBubbleColor(holderId, color)}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={() => setDragOverIdx(idx)}
                onDrop={() => handleDrop(dragIdx, dragOverIdx)}
                onOpenItem={item => setViewPopup({ item, color: bubbleColor })}
                cols={cols}
              />
            )
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="cg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 4 }}>
          {!filtered.length && <div className="empty"><div className="empty-icon">⚔</div><p>No items yet.</p></div>}
          {filtered.map((e, i) => {
            const isOpen = expanded === e.id
            return (
              <div key={e.id} className="entry-card"
                style={{ '--card-color': 'var(--ci)', background: i % 2 === 1 ? 'rgba(255,255,255,.01)' : undefined }}
                onClick={() => setExpanded(isOpen ? null : e.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.name || '', search) }} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {(e.transfers || []).length > 0 && <span style={{ fontSize: 9, color: 'var(--sp)' }}>↔</span>}
                    {e.holder && <div style={{ fontSize: 10, color: 'var(--ci)' }}>{holderName(e.holder)}</div>}
                  </div>
                </div>
                <div className="entry-meta">
                  {e.status && <span className={`badge badge-${e.status}`}>{SL[e.status]}</span>}
                  {(e.books || []).map(b => <span key={b} className="badge badge-book">{b}</span>)}
                </div>
                {isOpen && (
                  <>
                    <div className="entry-detail">
                      {e.origin && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Origin: </strong>{e.origin}</div>}
                      {e.significance && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Significance: </strong>{e.significance}</div>}
                      {e.shared_with && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Shared with: </strong>{holderName(e.shared_with)}</div>}
                    </div>
                    <div className="entry-actions">
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--ci)', borderColor: 'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--ci)', borderColor: 'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setTransferId(e.id) }}>↔ Transfer</button>
                      <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {viewPopup && (
        <ItemPopup item={viewPopup.item || viewPopup} color={viewPopup.color} items={items} chars={chars} db={db}
          onClose={() => setViewPopup(null)}
          onEdit={item => { setEditing(item); setModalOpen(true) }}
          onTransfer={id => setTransferId(id)}
          setLightbox={setLightbox}
          setPickerForItem={setPickerForItem}
          uploadingImg={uploadingImg}
          handleImageUpload={handleImageUpload} />
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <ImagePicker open={!!pickerForItem} db={db} onClose={() => setPickerForItem(null)}
        onPick={url => {
          const item = items.find(x => x.id === pickerForItem)
          if (item) db.upsertEntry('items', { ...item, image: url })
          setPickerForItem(null)
        }} />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id ? 'Edit' : 'Add'} Item`} color="var(--ci)">
        <EntryForm fields={ITEM_FIELDS} entry={editing || {}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--ci)" db={db} />
      </Modal>

      <Modal open={!!transferId} onClose={() => setTransferId(null)} title="Transfer Item" color="var(--ci)">
        <div className="field"><label>Transfer To</label>
          <select value={txForm.to} onChange={e => setTxForm(p => ({ ...p, to: e.target.value }))}>
            <option value="">— Pick character —</option>
            {chars.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input value={txForm.note} onChange={e => setTxForm(p => ({ ...p, note: e.target.value }))} />
        </div>
        <div className="field"><label>When</label>
          <input value={txForm.when} onChange={e => setTxForm(p => ({ ...p, when: e.target.value }))} placeholder="e.g. End of Book 1" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setTransferId(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--ci)' }} onClick={doTransfer}>Transfer</button>
        </div>
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{items.find(e => e.id === confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('items', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
