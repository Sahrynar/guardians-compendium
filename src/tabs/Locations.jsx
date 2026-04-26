import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import AlphabetJumpBar from '../components/common/AlphabetJumpBar'
import EntryPreviewModal from '../components/common/EntryPreviewModal'
import { TAB_RAINBOW } from '../constants'
import { scrollAndFlashEntry } from '../components/common/entryNav'

const tabColor = TAB_RAINBOW.locations || '#aaaaaa'
const COLS_MAP = { XS: 5, S: 4, M: 3, L: 2, XL: 1 }

const LOC_FIELDS = [
  { k: 'name', l: 'Name', t: 'text', r: true },
  { k: 'loc_type', l: 'Type', t: 'sel', o: ['', 'World', 'Continent', 'Country', 'City/Town', 'Building', 'Room/Area', 'Landmark', 'Island', 'Body of Water', 'Portal', 'Other'] },
  { k: 'parent_id', l: 'Inside / Part of', t: 'locsel' },
  { k: 'description', l: 'Description', t: 'ta' },
]

function locPath(id, locations) {
  const parts = []
  let cur = locations.find(l => l.id === id)
  while (cur) {
    parts.unshift(cur.name)
    cur = cur.parent_id ? locations.find(l => l.id === cur.parent_id) : null
  }
  return parts.join(' → ')
}

function LocNode({ loc, locations, expanded, onToggle, onEdit, onDelete, onAddChild }) {
  const kids = locations.filter(l => l.parent_id === loc.id)
  const isOpen = expanded.has(loc.id)
  return (
    <div style={{ marginBottom: 2 }}>
      <div id={`gcomp-entry-${loc.id}`} className="loc-node" onClick={() => onToggle(loc.id)}>
        {kids.length > 0 ? <span style={{ fontSize: '0.69em', color: tabColor, transition: '.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span> : <span style={{ width: 12 }} />}
        <span style={{ fontSize: '0.92em', fontWeight: 600 }}>{loc.name}</span>
        {loc.status && <span className={`badge badge-${loc.status}`} style={{ marginLeft: 4 }}>{loc.status}</span>}
        {loc.auto_imported && <span style={{ marginLeft: 6, fontSize: '0.69em', color: '#ffcc00' }}>📥</span>}
        <span style={{ fontSize: '0.69em', color: 'var(--mut)', marginLeft: 'auto' }}>{loc.loc_type || ''}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '6px 8px 6px 24px', fontSize: '0.85em', color: 'var(--dim)' }}>
          {loc.description && <div>{loc.description}</div>}
          {loc.notes && <div className="entry-notes">{loc.notes}</div>}
          <div className="entry-actions" style={{ marginTop: 4 }}>
            <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor }} onClick={e => { e.stopPropagation(); onEdit(loc) }}>✎ Edit</button>
            <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor }} onClick={e => { e.stopPropagation(); onAddChild(loc.id) }}>+ Child</button>
            <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={e => { e.stopPropagation(); onDelete(loc.id) }}>✕</button>
          </div>
        </div>
      )}
      {isOpen && kids.length > 0 && (
        <div className="loc-children">
          {kids.map(k => <LocNode key={k.id} loc={k} locations={locations} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />)}
        </div>
      )}
    </div>
  )
}

function FlatTable({ locations, onEdit, onDelete, onAddChild }) {
  const [colWidths, setColWidths] = useState([220, 140, 200, 160, 80])
  const dragging = useRef(null)

  function onMouseDown(e, idx) {
    e.preventDefault()
    dragging.current = { idx, startX: e.clientX, startW: colWidths[idx] }
    function onMove(ev) {
      if (!dragging.current) return
      const delta = ev.clientX - dragging.current.startX
      setColWidths(prev => {
        const next = [...prev]
        next[dragging.current.idx] = Math.max(60, dragging.current.startW + delta)
        return next
      })
    }
    function onUp() {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const COLS = ['Name', 'Type', 'Path', 'Description', 'Actions']
  const tdStyle = i => ({ padding: '5px 8px', borderBottom: '1px solid var(--brd)', fontSize: '0.85em', color: 'var(--tx)', verticalAlign: 'top', maxWidth: colWidths[i], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
        <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead>
          <tr style={{ background: 'var(--sf)', borderBottom: `2px solid ${tabColor}` }}>
            {COLS.map((col, i) => (
              <th key={col} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '0.77em', fontWeight: 700, color: tabColor, textTransform: 'uppercase', letterSpacing: '.05em', position: 'relative', userSelect: 'none', width: colWidths[i] }}>
                {col}
                {i < COLS.length - 1 && <div onMouseDown={e => onMouseDown(e, i)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', background: 'transparent', zIndex: 1 }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {locations.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--mut)', fontStyle: 'italic' }}>No locations found.</td></tr>}
          {locations.map((l, idx) => (
            <tr key={l.id} id={`gcomp-entry-${l.id}`} style={{ background: idx % 2 === 0 ? 'var(--card)' : 'transparent', cursor: 'pointer' }} onClick={() => onEdit(l)}>
              <td style={tdStyle(0)}><span style={{ fontWeight: 600 }}>{l.name}</span></td>
              <td style={tdStyle(1)}><span style={{ color: tabColor, fontSize: '0.85em' }}>{l.loc_type || '—'}</span></td>
              <td style={{ ...tdStyle(2), color: 'var(--dim)' }}>{locPath(l.id, locations) || '—'}</td>
              <td style={{ ...tdStyle(3), color: 'var(--dim)' }}>{l.description || '—'}</td>
              <td style={{ ...tdStyle(4), whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor, marginRight: 3 }} onClick={e => { e.stopPropagation(); onEdit(l) }}>👁</button>
                <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor, marginRight: 3 }} onClick={e => { e.stopPropagation(); onAddChild(l.id) }}>+</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={e => { e.stopPropagation(); onDelete(l.id) }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Locations({ db, navSearch }) {
  const locations = db.db.locations || []
  const [view, setView] = useState('tree')
  const [expanded, setExpanded] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [autoOnly, setAutoOnly] = useState(false)
  const [previewEntry, setPreviewEntry] = useState(null)
  const [cols, setCols] = useState(() => {
    try { return localStorage.getItem('locations_cols') || 'M' } catch { return 'M' }
  })
  const [sortMode, setSortMode] = useState(() => {
    try { return localStorage.getItem('locations_sort') || 'name' } catch { return 'name' }
  })
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState(navSearch || '')

  function setColsPersist(v) {
    setCols(v)
    try { localStorage.setItem('locations_cols', v) } catch {}
  }

  function setSortPersist(v) {
    setSortMode(v)
    try { localStorage.setItem('locations_sort', v) } catch {}
  }

  const autoCount = locations.filter(l => l.auto_imported === true).length

  useEffect(() => {
    setSearch(navSearch || '')
  }, [navSearch])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = locations.find(x => x.id === targetId)
      if (!entry) return
      setPreviewEntry(entry)
      setExpanded(prev => new Set(prev).add(targetId))
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [locations])

  function toggle(id) { setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function openAdd(parentId) { setEditing(parentId ? { parent_id: parentId } : {}); setModalOpen(true) }
  function handleSave(entry) { db.upsertEntry('locations', entry); setModalOpen(false); setEditing(null) }
  function handleDelete(id) {
    db.deleteEntry('locations', id)
    ;(db.db.locations || []).filter(l => l.parent_id === id).forEach(l => db.upsertEntry('locations', { ...l, parent_id: '' }))
    setConfirmId(null)
  }

  const typeOptions = useMemo(() => {
    const types = new Set()
    locations.forEach(l => { if (l.loc_type) types.add(l.loc_type) })
    return ['all', ...Array.from(types).sort()]
  }, [locations])

  const displayLocations = useMemo(() => {
    let list = locations.filter(l => !autoOnly || l.auto_imported === true)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l => JSON.stringify(l).toLowerCase().includes(q))
    }
    if (filterType !== 'all') list = list.filter(l => l.loc_type === filterType)
    if (sortMode === 'recent') list = [...list].sort((a, b) => new Date(b.updated || b.updated_at || b.created || 0) - new Date(a.updated || a.updated_at || a.created || 0))
    else if (sortMode === 'type') list = [...list].sort((a, b) => (a.loc_type || '').localeCompare(b.loc_type || '') || (a.name || '').localeCompare(b.name || ''))
    else list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return list
  }, [locations, search, autoOnly, filterType, sortMode])

  const roots = displayLocations.filter(l => !l.parent_id)
  const orphans = displayLocations.filter(l => l.parent_id && !displayLocations.find(p => p.id === l.parent_id))
  const btnStyle = active => ({ fontSize: '0.77em', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${active ? tabColor : 'var(--brd)'}`, background: active ? `${tabColor}22` : 'none', color: active ? tabColor : 'var(--dim)' })

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: tabColor }}>🗺 Locations</div>
        <input className="sx" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180, maxWidth: 280 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={btnStyle(view === 'tree')} onClick={() => setView('tree')}>🌳 Tree</button>
          <button style={btnStyle(view === 'table')} onClick={() => setView('table')}>☰ Table</button>
        </div>
        {view === 'tree' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['XS', 'S', 'M', 'L', 'XL'].map(l => (
              <button key={l} onClick={() => setColsPersist(l)} style={{ fontSize: '0.77em', padding: '2px 7px', borderRadius: 4, border: `1px solid ${cols === l ? tabColor : 'var(--brd)'}`, background: cols === l ? `${tabColor}22` : 'transparent', color: cols === l ? tabColor : 'var(--dim)', cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        )}
        <select value={sortMode} onChange={e => setSortPersist(e.target.value)} style={{ fontSize: '0.85em', padding: '4px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="name">Sort: A-Z</option>
          <option value="recent">Sort: Recent</option>
          <option value="type">Sort: Type</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: '0.85em', padding: '4px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          {typeOptions.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        {autoCount > 0 && <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>📥 Auto-imported ({autoCount})</button>}
        <button className="btn btn-primary btn-sm" style={{ background: tabColor, color: '#000' }} onClick={() => openAdd()}>+ Add</button>
      </div>

      <AlphabetJumpBar entries={displayLocations} getName={e => e.name} onJump={target => scrollAndFlashEntry(target.id)} color={tabColor} />

      {!locations.length && <div className="empty"><div className="empty-icon">🗺</div><p>No locations yet.</p></div>}

      {view === 'tree' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS_MAP[cols]}, 1fr)`, gap: 8, alignItems: 'start' }}>
          {roots.map(l => <LocNode key={l.id} loc={l} locations={displayLocations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />)}
          {orphans.map(l => <LocNode key={l.id} loc={l} locations={displayLocations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />)}
        </div>
      )}

      {view === 'table' && <FlatTable locations={displayLocations} onEdit={e => setPreviewEntry(e)} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id ? 'Edit' : 'Add'} Location`} color={tabColor}>
        <EntryForm fields={LOC_FIELDS} entry={editing || {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color={tabColor} db={db} />
      </Modal>

      <EntryPreviewModal
        open={!!previewEntry}
        entry={previewEntry}
        category="locations"
        color={tabColor}
        onClose={() => setPreviewEntry(null)}
        onEdit={() => { setEditing(previewEntry); setPreviewEntry(null); setModalOpen(true) }}
      />

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{locations.find(l => l.id === confirmId)?.name}</strong>?<br /><span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>Children will be detached, not deleted.</span></p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
