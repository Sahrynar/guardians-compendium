import React, { useState, useMemo } from 'react'
import OutfitSnapshot from './OutfitSnapshot'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { uploadImage } from '../hooks/useImageUpload'
import { highlight, SL } from '../constants'

// ── Category config ───────────────────────────────────────────────
const CATEGORIES = [
  { id: 'Clothing',       icon: '👗', color: '#8B5CF6' },
  { id: 'Jewelry',        icon: '💎', color: '#F59E0B' },
  { id: 'Accessory',      icon: '🧣', color: '#10B981' },
  { id: 'Weapon',         icon: '⚔',  color: '#EF4444' },
  { id: 'Armor',          icon: '🛡',  color: '#6B7280' },
  { id: 'Book / Document',icon: '📖', color: '#3B82F6' },
  { id: 'Animal / Bond',  icon: '🐾', color: '#84CC16' },
  { id: 'Key',            icon: '🗝',  color: '#F97316' },
  { id: 'Style',          icon: '✨',  color: '#EC4899' },
  { id: 'Other',          icon: '📦', color: '#9CA3AF' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// ── Entry fields ──────────────────────────────────────────────────
const INV_FIELDS = [
  { k: 'name',          l: 'Name',            t: 'text', r: true },
  { k: 'category',      l: 'Category',        t: 'sel',
    o: ['', ...CATEGORIES.map(c => c.id)] },
  { k: 'character',     l: 'Character / Holder', t: 'charsel' },
  { k: 'shared_with',   l: 'Shared With',     t: 'charsel' },
  { k: 'entry_color',   l: 'Entry Colour',    t: 'color', p: 'Leave blank to use bubble colour' },
  { k: 'style_origin',  l: 'Style / Origin Country', t: 'text', p: 'e.g. Murvetian, Dreslundic…' },
  { k: 'color_material',l: 'Colour / Material', t: 'text' },
  { k: 'description',   l: 'Description',     t: 'ta' },
  { k: 'significance',  l: 'Significance',    t: 'ta' },
  { k: 'image',         l: 'Image URL',       t: 'text', p: 'Paste URL or upload via popup' },
  { k: 'books',         l: 'Books',           t: 'booksel' },
  { k: 'status',        l: 'Status',          t: 'statussel' },
  { k: 'notes',         l: 'Notes',           t: 'ta' },
]

// Default bubble colors per position
const DEFAULT_COLORS = [
  '#1a4a6b','#4a1a6b','#1a6b4a','#6b4a1a','#6b1a4a',
  '#1a6b6b','#6b1a1a','#4a6b1a','#2a3a5a','#5a2a3a',
  '#c0392b','#8e44ad','#2980b9','#27ae60','#f39c12',
]

const PRESET_COLORS = [
  '#1a4a6b','#4a1a6b','#1a6b4a','#6b4a1a','#6b1a4a',
  '#1a6b6b','#6b1a1a','#4a6b1a','#c0392b','#8e44ad',
  '#2980b9','#27ae60','#f39c12','#e91e63','#16a085',
  '#d35400','#2c3e50','#7f8c8d','#e74c3c','#f39c12',
  '#ffffff','#cccccc','#888888','#333333','#000000',
]

// ── Color picker popup ────────────────────────────────────────────
function ColorPicker({ value, onChange, onClose }) {
  return (
    <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 200,
      background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 10,
      padding: 10, width: 170, boxShadow: '0 4px 20px rgba(0,0,0,.6)' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Colour</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, marginBottom: 8 }}>
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => { onChange(c); onClose() }}
            style={{ width: 24, height: 24, borderRadius: '50%', background: c,
              border: c === value ? '2px solid var(--tx)' : '2px solid transparent',
              cursor: 'pointer' }} />
        ))}
      </div>
      <input type="color" value={value || '#1a4a6b'} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
      <button onClick={onClose}
        style={{ marginTop: 6, width: '100%', fontSize: '0.77em', padding: '3px 0',
          background: 'none', border: '1px solid var(--brd)', borderRadius: 6,
          color: 'var(--mut)', cursor: 'pointer' }}>Done</button>
    </div>
  )
}

// ── Compact entry tile ────────────────────────────────────────────
function EntryTile({ entry, bubbleColor, onOpen, search }) {
  const cat = CAT_MAP[entry.category]
  const tileColor = entry.entry_color || bubbleColor || '#3a86ff'
  return (
    <div onClick={() => onOpen(entry)}
      style={{ background: 'var(--card)', border: `1px solid ${tileColor}44`,
        borderTop: `3px solid ${tileColor}`,
        borderRadius: 8, padding: '8px 10px', cursor: 'pointer', transition: '.12s',
        position: 'relative' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tileColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${tileColor}44`}>
      {entry.image && (
        <img src={entry.image} alt={entry.name}
          style={{ width: '100%', height: 55, objectFit: 'cover', borderRadius: 5, marginBottom: 5, display: 'block' }}
          onError={e => e.target.style.display = 'none'} />
      )}
      {(entry.transfers || []).length > 0 && (
        <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.69em',
          background: 'rgba(255,170,51,.2)', color: 'var(--sp)',
          border: '1px solid rgba(255,170,51,.3)', borderRadius: 4, padding: '1px 4px' }}>↔</span>
      )}
      <div style={{ fontSize: '0.85em', fontWeight: 600, lineHeight: 1.3, color: 'var(--tx)', marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: highlight(entry.name || '', search) }} />
      {cat && (
        <div style={{ fontSize: '0.69em', color: tileColor, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          {cat.icon} {entry.category}
        </div>
      )}
      {entry.color_material && (
        <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>{entry.color_material}</div>
      )}
      {entry.status && (
        <div style={{ marginTop: 3 }}>
          <span className={`badge badge-${entry.status}`}>{SL[entry.status]}</span>
        </div>
      )}
    </div>
  )
}

// ── Character bubble ──────────────────────────────────────────────
function CharBubble({ char, entries, idx, chars, search, onOpenEntry,
  onColorChange, onDragStart, onDragOver, onDrop, dragging, columns }) {
  const isUnassigned = char === '__unassigned__'
  const charObj = isUnassigned ? null : char
  const name = isUnassigned ? 'Unassigned' : (charObj?.name || 'Unknown')
  const bubbleColor = charObj?.bubble_color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
  const [showPicker, setShowPicker] = useState(false)

  // Group entries by category inside the bubble
  const byCategory = {}
  entries.forEach(e => {
    const k = e.category || 'Other'
    if (!byCategory[k]) byCategory[k] = []
    byCategory[k].push(e)
  })
  const catOrder = CATEGORIES.map(c => c.id).filter(id => byCategory[id])

  return (
    <div draggable onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={onDrop}
      style={{ border: `2px solid ${bubbleColor}`, borderRadius: 12,
        background: `${bubbleColor}14`, padding: 12,
        opacity: dragging ? 0.4 : 1, transition: '.15s', cursor: 'grab',
        breakInside: 'avoid' }}>

      {/* Bubble header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {charObj?.reference_image && (
          <img src={charObj.reference_image} alt={name}
            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover',
              border: `2px solid ${bubbleColor}` }}
            onError={e => e.target.style.display = 'none'} />
        )}
        <div style={{ flex: 1, fontFamily: "'Cinzel',serif", fontSize: '0.92em',
          fontWeight: 700, color: bubbleColor }}>{name}</div>
        <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>
          {entries.length} item{entries.length !== 1 ? 's' : ''}
        </div>
        {/* Color dot */}
        {!isUnassigned && (
          <div style={{ position: 'relative' }}>
            <button onClick={e => { e.stopPropagation(); setShowPicker(p => !p) }}
              title="Change bubble colour"
              style={{ width: 18, height: 18, borderRadius: '50%', background: bubbleColor,
                border: '2px solid rgba(255,255,255,.3)', cursor: 'pointer', flexShrink: 0 }} />
            {showPicker && (
              <ColorPicker value={bubbleColor} onChange={onColorChange}
                onClose={() => setShowPicker(false)} />
            )}
          </div>
        )}
      </div>

      {/* Entries grouped by category */}
      {entries.length === 0 ? (
        <div style={{ fontSize: '0.77em', color: 'var(--mut)', padding: '8px 0', textAlign: 'center' }}>No items</div>
      ) : (
        catOrder.map(catId => {
          const cat = CAT_MAP[catId]
          const catEntries = byCategory[catId]
          return (
            <div key={catId} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', color: cat?.color || 'var(--dim)',
                marginBottom: 5 }}>
                {cat?.icon} {catId}
              </div>
              <div style={{ display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${columns === 1 ? '200px' : '100px'}, 1fr))`,
                gap: 5 }}>
                {catEntries.map(e => (
                  <EntryTile key={e.id} entry={e} bubbleColor={bubbleColor}
                    onOpen={onOpenEntry} search={search} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Full entry popup ──────────────────────────────────────────────
function EntryPopup({ entry, allEntries, chars, db, onClose, onEdit, onTransfer, bubbleColor,
  setLightbox, setPickerFor, uploadingImg, handleImageUpload }) {
  function holderName(id) {
    if (!id) return 'Unassigned'
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : id
  }
  const cat = CAT_MAP[entry.category]
  const tileColor = entry.entry_color || bubbleColor || '#3a86ff'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--sf)', border: `1px solid ${tileColor}44`,
        borderTop: `3px solid ${tileColor}`,
        borderRadius: 12, padding: 20, maxWidth: 520, width: '100%',
        maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: tileColor }}>{entry.name}</div>
            {cat && <div style={{ fontSize: '0.77em', color: cat.color, marginTop: 2 }}>{cat.icon} {entry.category}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '1.38em', color: 'var(--mut)', marginLeft: 10 }}>✕</button>
        </div>

        {/* Image */}
        <div style={{ marginBottom: 14 }}>
          {entry.image ? (
            <img src={entry.image} alt={entry.name}
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain',
                borderRadius: 8, background: 'var(--card)', cursor: 'pointer', display: 'block' }}
              onClick={() => setLightbox(entry.image)}
              onError={e => e.target.style.display = 'none'} />
          ) : (
            <div style={{ width: '100%', height: 50, border: '1px dashed var(--brd)',
              borderRadius: 8, background: 'var(--card)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--mut)', fontSize: '0.85em' }}>No image</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', fontSize: '0.77em' }}>
              {uploadingImg === entry.id ? 'Uploading…' : '⬆ Upload'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) handleImageUpload(entry.id, f); e.target.value = '' }} />
            </label>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.77em' }}
              onClick={() => { onClose(); setPickerFor(entry.id) }}>🖼 Browse Library</button>
            {entry.image && (
              <button className="btn btn-sm btn-outline"
                style={{ fontSize: '0.77em', color: '#ff3355', borderColor: '#ff335544' }}
                onClick={() => {
                  const it = allEntries.find(x => x.id === entry.id)
                  if (it) db.upsertEntry('inventory', { ...it, image: null })
                }}>Remove</button>
            )}
          </div>
        </div>

        {[['Holder', holderName(entry.character || entry.holder)],
          ['Shared With', (entry.character || entry.holder) && entry.shared_with ? holderName(entry.shared_with) : null],
          ['Style / Origin', entry.style_origin],
          ['Colour / Material', entry.color_material],
          ['Status', entry.status ? SL[entry.status] : null],
          ['Books', (entry.books || []).join(', ')],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.69em', fontWeight: 700, color: tileColor,
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.92em', color: 'var(--tx)' }}>{val}</div>
          </div>
        ))}

        {entry.description && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.69em', fontWeight: 700, color: tileColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Description</div>
            <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.6 }}>{entry.description}</div>
          </div>
        )}
        {entry.significance && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.69em', fontWeight: 700, color: tileColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Significance</div>
            <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.6 }}>{entry.significance}</div>
          </div>
        )}

        {(entry.transfers || []).length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--brd)' }}>
            <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--sp)',
              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>↔ Transfer History</div>
            {entry.transfers.map((t, i) => (
              <div key={i} style={{ fontSize: '0.85em', color: 'var(--dim)', marginBottom: 3 }}>
                {t.from || '?'} → {t.to || '?'}
                {t.note ? ` · ${t.note}` : ''}
                {t.when ? <span style={{ color: 'var(--mut)' }}> ({t.when})</span> : ''}
              </div>
            ))}
          </div>
        )}

        {entry.notes && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--brd)',
            fontSize: '0.85em', color: 'var(--dim)', lineHeight: 1.6 }}>{entry.notes}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" style={{ color: tileColor, borderColor: `${tileColor}44` }}
            onClick={() => { onClose(); onEdit(entry) }}>✎ Edit</button>
          {onTransfer && (
            <button className="btn btn-outline btn-sm" style={{ color: tileColor, borderColor: `${tileColor}44` }}
              onClick={() => { onClose(); onTransfer(entry.id) }}>↔ Transfer</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN INVENTORY COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function Inventory({ db }) {
  // Merge legacy items + wardrobe + inventory into one list
  const rawInventory = db.db.inventory || []
  const rawItems = (db.db.items || []).map(e => ({ ...e, _source: 'items',
    character: e.holder || e.character, category: e.item_type || e.category || 'Other' }))
  const rawWardrobe = (db.db.wardrobe || []).map(e => ({ ...e, _source: 'wardrobe',
    category: e.item_type || e.category || 'Clothing' }))

  // Combine: inventory is primary, legacy data shows if not yet migrated
  const allEntries = useMemo(() => {
    const ids = new Set(rawInventory.map(e => e.id))
    return [
      ...rawInventory,
      ...rawItems.filter(e => !ids.has(e.id)),
      ...rawWardrobe.filter(e => !ids.has(e.id)),
    ]
  }, [rawInventory, rawItems, rawWardrobe])

  const chars = [...(db.db.characters || [])].sort((a,b) => (a.display_name||a.name||'').localeCompare(b.display_name||b.name||''))

  // ── State ──
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('bubble') // 'bubble' | 'list' | 'outfit'
  const [filterCat, setFilterCat] = useState('all')
  const [filterChar, setFilterChar] = useState('all')
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterChars, setFilterChars] = useState(new Set()) // multi-select characters
  const [sortBy, setSortBy] = useState('holder') // 'holder' | 'name' | 'category'
  const [columns, setColumns] = useState(() => {
    try { return parseInt(db.getSetting?.('inv_columns') || '2') } catch { return 2 }
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [transferId, setTransferId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [txForm, setTxForm] = useState({ to: '', note: '', when: '' })
  const [uploadingImg, setUploadingImg] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [pickerFor, setPickerFor] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  function saveColumns(n) {
    setColumns(n)
    db.saveSetting?.('inv_columns', String(n))
  }

  async function handleImageUpload(entryId, file) {
    setUploadingImg(entryId)
    const { url, error } = await uploadImage(file, 'inventory')
    if (url) {
      const e = allEntries.find(x => x.id === entryId)
      if (e) db.upsertEntry('inventory', { ...e, image: url })
    } else { alert(error || 'Upload failed') }
    setUploadingImg(null)
  }

  function handleSave(entry) {
    // Always save to inventory category regardless of source
    db.upsertEntry('inventory', { ...entry, _source: undefined })
    setModalOpen(false); setEditing(null)
  }

  function handleBubbleColor(charId, color) {
    const ch = chars.find(c => c.id === charId)
    if (ch) db.upsertEntry('characters', { ...ch, bubble_color: color })
  }

  const dropSaveRef = React.useRef(null)
  function handleDrop(fromIdx, toIdx) {
    if (fromIdx === null || fromIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const newOrder = [...holderOrder]
    const [moved] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)
    setDragIdx(null); setDragOverIdx(null)
    // Debounce Supabase save - only save after drag ends
    clearTimeout(dropSaveRef.current)
    dropSaveRef.current = setTimeout(() => {
      newOrder.forEach((holderId, idx) => {
        if (holderId === '__unassigned__') return
        const ch = chars.find(c => c.id === holderId)
        if (ch) db.upsertEntry('characters', { ...ch, bubble_order: String(idx + 1) })
      })
    }, 600)
  }

  function doTransfer() {
    const entry = allEntries.find(x => x.id === transferId)
    if (!entry || !txForm.to) return
    const toChar = chars.find(c => c.name === txForm.to || c.id === txForm.to)
    const transfers = [...(entry.transfers || []), {
      from: charName(entry.character || entry.holder),
      to: txForm.to, note: txForm.note, when: txForm.when
    }]
    db.upsertEntry('inventory', { ...entry, character: toChar ? toChar.id : txForm.to, transfers })
    setTransferId(null); setTxForm({ to: '', note: '', when: '' })
  }

  function charName(id) {
    if (!id) return 'Unassigned'
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : id
  }

  // ── Filtering ──
  // Collect all unique groups from characters
  const allGroups = useMemo(() => {
    const gs = new Set()
    chars.forEach(c => { if (c.groups) c.groups.split(',').forEach(g => { const t=g.trim(); if(t) gs.add(t) }) })
    return [...gs].sort()
  }, [chars])

  const filtered = useMemo(() => allEntries.filter(e => {
    const ms = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
    const mc = filterCat === 'all' || (e.category || 'Other') === filterCat
    const holderId = e.character || e.holder || '__unassigned__'
    // Multi-char filter
    const mch = filterChars.size === 0
      ? (filterChar === 'all' || holderId === filterChar)
      : filterChars.has(holderId)
    // Group filter
    const mchg = filterGroup === 'all' ? true : (() => {
      const ch = chars.find(c => c.id === holderId)
      return ch?.groups?.split(',').map(g => g.trim()).includes(filterGroup)
    })()
    return ms && mc && mch && mchg
  }), [allEntries, search, filterCat, filterChar, filterChars, filterGroup, chars])

  // ── Grouping for bubble view ──
  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach(e => {
      const k = e.character || e.holder || '__unassigned__'
      if (!g[k]) g[k] = []
      g[k].push(e)
    })
    return g
  }, [filtered])

  const holderOrder = useMemo(() => {
    const order = chars
      .filter(c => grouped[c.id])
      .sort((a, b) => {
        const ao = parseFloat(a.bubble_order) || 999
        const bo = parseFloat(b.bubble_order) || 999
        return ao !== bo ? ao - bo : (a.name || '').localeCompare(b.name || '')
      })
      .map(c => c.id)
    if (grouped['__unassigned__']) order.push('__unassigned__')
    return order
  }, [chars, grouped])

  // ── List sorted ──
  const sortedList = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')
    // holder
    return charName(a.character || a.holder).localeCompare(charName(b.character || b.holder)) || (a.name || '').localeCompare(b.name || '')
  }), [filtered, sortBy])

  const usedChars = chars.filter(c => grouped[c.id])

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <input className="sx" style={{ minWidth: 120 }} placeholder="Search inventory…"
          value={search} onChange={e => setSearch(e.target.value)} />

        {/* Category filter */}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)',
            border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
        </select>

        {/* Character filter */}
        <select value={filterChar} onChange={e => { setFilterChar(e.target.value); setFilterChars(new Set()) }}
          style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)',
            border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All characters</option>
          {usedChars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          {grouped['__unassigned__'] && <option value="__unassigned__">Unassigned</option>}
        </select>
        {/* Group filter */}
        {allGroups.length > 0 && (
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)',
              border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
            <option value="all">All groups</option>
            {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[['bubble','🫧 Bubbles'],['list','☰ List'],['outfit','👗 Outfits']].map(([v,l]) => (
            <button key={v} className={`btn btn-sm btn-outline ${viewMode===v?'active':''}`}
              style={{ fontSize: '0.77em' }} onClick={() => setViewMode(v)}>{l}</button>
          ))}
        </div>

        {/* List sort (only in list mode) */}
        {viewMode === 'list' && (
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)',
              border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
            <option value="holder">Sort: By Holder</option>
            <option value="name">Sort: A → Z</option>
            <option value="category">Sort: By Category</option>
          </select>
        )}

        {/* Column picker — XS=most cols, XL=1 col */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[['XS',5],['S',4],['M',3],['L',2],['XL',1]].map(([l,n]) => (
            <button key={l} onClick={() => saveColumns(n)}
              style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8,
                background: columns===n ? '#3a86ff' : 'none',
                color: columns===n ? '#fff' : 'var(--dim)',
                border: `1px solid ${columns===n ? '#3a86ff' : 'var(--brd)'}`,
                cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Main content area ── */}
      {viewMode === 'outfit' ? (
      <OutfitSnapshot db={db} />
    ) : viewMode === 'list' ? (
      <div style={{ marginTop: 6 }}>
        {!sortedList.length && (
          <div className="empty"><div className="empty-icon">🎒</div><p>No items found.</p></div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 6 }}>
          {sortedList.map((entry, i) => {
            const tileColor = entry.entry_color || '#3a86ff'
            return (
              <div key={entry.id} className="entry-card" style={{ '--card-color': tileColor }}
                onClick={() => setViewPopup(entry)}>
                <div className="entry-title" style={{ fontSize: '0.92em' }}>{entry.name || '(unnamed)'}</div>
                <div style={{ fontSize: '0.77em', color: tileColor, marginTop: 2 }}>
                  {charName(entry.character || entry.holder)}
                </div>
                {entry.category && <div className="badge" style={{ marginTop: 3, fontSize: '0.62em', color: 'var(--dim)', border: '1px solid var(--brd)', padding: '1px 5px', borderRadius: 6, display: 'inline-block' }}>{entry.category}</div>}
              </div>
            )
          })}
        </div>
      </div>
    ) : (
      /* Bubble view — grouped by character */
      <div style={{ marginTop: 6 }}>
        {holderOrder.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🎒</div>
            <p>No inventory yet.</p>
            <button className="btn btn-primary" style={{ background: '#3a86ff' }}
              onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Item</button>
          </div>
        )}
        {holderOrder.map((holderId, hi) => {
          const items = grouped[holderId] || []
          if (!items.length) return null
          const ch = chars.find(c => c.id === holderId)
          const bubbleColor = ch?.bubble_color || '#3a86ff'
          const holderName = holderId === '__unassigned__' ? 'Unassigned' : charName(holderId)
          return (
            <div key={holderId} style={{ marginBottom: 14,
              border: `1px solid ${bubbleColor}44`, borderRadius: 'var(--rl)',
              background: `${bubbleColor}08`, overflow: 'hidden' }}
              draggable={holderId !== '__unassigned__'}
              onDragStart={() => setDragIdx(hi)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(hi) }}
              onDrop={() => handleDrop(dragIdx, hi)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: `${bubbleColor}18`, borderBottom: `1px solid ${bubbleColor}33` }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', fontWeight: 700, color: bubbleColor }}>
                  {ch?.reference_image && (
                    <img src={ch.reference_image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginRight: 6, verticalAlign: 'middle', border: `1px solid ${bubbleColor}` }} />
                  )}
                  {holderName}
                </div>
                <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 6, padding: 8 }}>
                {items.map(entry => {
                  const tileColor = entry.entry_color || bubbleColor
                  return (
                    <div key={entry.id} className="entry-card" style={{ '--card-color': tileColor, cursor: 'pointer' }}
                      onClick={() => setViewPopup(entry)}>
                      {entry.image && (
                        <img src={entry.image} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                      <div className="entry-title" style={{ fontSize: '0.85em' }}>{entry.name || '(unnamed)'}</div>
                      {entry.category && <div style={{ fontSize: '0.69em', color: tileColor, marginTop: 2 }}>{entry.category}</div>}
                    </div>
                  )
                })}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60,
                  border: '1px dashed var(--brd)', borderRadius: 'var(--r)', cursor: 'pointer', opacity: 0.5 }}
                  onClick={() => { setEditing(holderId === '__unassigned__' ? {} : { character: holderId }); setModalOpen(true) }}>
                  <span style={{ fontSize: '1.38em', color: 'var(--mut)' }}>+</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )}

    {/* ── Item view popup ── */}
    {viewPopup && (
      <div className="modal-overlay open" onClick={() => setViewPopup(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <button className="modal-close" onClick={() => setViewPopup(null)}>✕</button>
          <div className="modal-title" style={{ color: viewPopup.entry_color || '#3a86ff' }}>
            {viewPopup.name}
          </div>
          {viewPopup.image && (
            <img src={viewPopup.image} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6, marginBottom: 10, cursor: 'pointer' }}
              onClick={() => setLightbox(viewPopup.image)} />
          )}
          <div className="entry-detail">
            {viewPopup.category && <div><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: '#3a86ff' }}>Category: </strong>{viewPopup.category}</div>}
            {viewPopup.description && <div style={{ marginTop: 4 }}>{viewPopup.description}</div>}
            {viewPopup.character && <div style={{ marginTop: 4 }}><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: '#3a86ff' }}>Holder: </strong>{charName(viewPopup.character)}</div>}
            {(viewPopup.transfers||[]).length > 0 && (
              <div style={{ marginTop: 6 }}>
                <strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: '#3a86ff' }}>Transfer History: </strong>
                {viewPopup.transfers.map((t, ti) => (
                  <div key={ti} style={{ fontSize: '0.77em', color: 'var(--dim)', paddingLeft: 8 }}>
                    {t.from} → {t.to}{t.when ? ` (${t.when})` : ''}{t.note ? ` — ${t.note}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => { setViewPopup(null); setEditing(viewPopup); setModalOpen(true) }}>✎ Edit</button>
            <button className="btn btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
              onClick={() => { setConfirmId(viewPopup.id); setViewPopup(null) }}>✕ Delete</button>
            <button className="btn btn-outline" onClick={() => setViewPopup(null)}>Close</button>
          </div>
        </div>
      </div>
    )}

    {/* Lightbox */}
    {lightbox && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setLightbox(null)}>
        <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
      </div>
    )}

    {/* Add/Edit modal */}
    <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
      title={editing?.id ? 'Edit Item' : 'Add Item'} color="#3a86ff">
      <EntryForm fields={INV_FIELDS} entry={editing || {}} db={db}
        onSave={entry => { handleSave(entry) }}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        color="#3a86ff" label="Items" />
    </Modal>

    {/* Transfer modal */}
    <Modal open={!!transferId} onClose={() => setTransferId(null)} title="Transfer Item" color="#3a86ff">
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
        <button className="btn btn-primary" style={{ background: '#3a86ff' }} onClick={doTransfer}>Transfer</button>
      </div>
    </Modal>

    {/* Confirm delete */}
    {confirmId && (
      <div className="confirm-overlay open">
        <div className="confirm-box">
          <p>Delete <strong>{allEntries.find(e => e.id === confirmId)?.name || 'this item'}</strong>?</p>
          <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
          <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('inventory', confirmId); setConfirmId(null) }}>Delete</button>
        </div>
      </div>
    )}
  </div>
  )
}
