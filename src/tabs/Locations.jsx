import { useEffect, useRef, useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import AlphabetJumpBar from '../components/common/AlphabetJumpBar'
import { scrollAndFlashEntry } from '../components/common/entryNav'

const TAB_COLOR = '#ffb700'

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
        {kids.length > 0 ? <span style={{ fontSize: '0.69em', color: TAB_COLOR, transition: '.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>►</span> : <span style={{ width: 12 }} />}
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
            <button className="btn btn-sm btn-outline" style={{ color: TAB_COLOR, borderColor: TAB_COLOR }} onClick={e => { e.stopPropagation(); onEdit(loc) }}>✎ Edit</button>
            <button className="btn btn-sm btn-outline" style={{ color: TAB_COLOR, borderColor: TAB_COLOR }} onClick={e => { e.stopPropagation(); onAddChild(loc.id) }}>+ Child</button>
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

function FlatTable({ locations, onEdit, onDelete, onAddChild, navSearch }) {
  const search = (navSearch || '').toLowerCase()
  const visible = locations.filter(l => !search || l.name?.toLowerCase().includes(search) || l.loc_type?.toLowerCase().includes(search) || l.description?.toLowerCase().includes(search))
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
          <tr style={{ background: 'var(--sf)', borderBottom: `2px solid ${TAB_COLOR}` }}>
            {COLS.map((col, i) => (
              <th key={col} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '0.77em', fontWeight: 700, color: TAB_COLOR, textTransform: 'uppercase', letterSpacing: '.05em', position: 'relative', userSelect: 'none', width: colWidths[i] }}>
                {col}
                {i < COLS.length - 1 && <div onMouseDown={e => onMouseDown(e, i)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', background: 'transparent', zIndex: 1 }} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--mut)', fontStyle: 'italic' }}>No locations found.</td></tr>}
          {visible.map((l, idx) => (
            <tr key={l.id} id={`gcomp-entry-${l.id}`} style={{ background: idx % 2 === 0 ? 'var(--card)' : 'transparent' }}>
              <td style={tdStyle(0)}><span style={{ fontWeight: 600 }}>{l.name}</span></td>
              <td style={tdStyle(1)}><span style={{ color: TAB_COLOR, fontSize: '0.85em' }}>{l.loc_type || '—'}</span></td>
              <td style={{ ...tdStyle(2), color: 'var(--dim)' }}>{locPath(l.id, locations) || '—'}</td>
              <td style={{ ...tdStyle(3), color: 'var(--dim)' }}>{l.description || '—'}</td>
              <td style={{ ...tdStyle(4), whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm btn-outline" style={{ color: TAB_COLOR, borderColor: TAB_COLOR, marginRight: 3 }} onClick={() => onEdit(l)}>✎</button>
                <button className="btn btn-sm btn-outline" style={{ color: TAB_COLOR, borderColor: TAB_COLOR, marginRight: 3 }} onClick={() => onAddChild(l.id)}>+</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => onDelete(l.id)}>✕</button>
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

  const search = (navSearch || '').toLowerCase()
  const autoCount = locations.filter(l => l.auto_imported === true).length

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = locations.find(x => x.id === targetId)
      if (!entry) return
      setEditing(entry)
      setModalOpen(true)
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

  const roots = locations.filter(l => !l.parent_id)
  const filtered = (search ? locations.filter(l => l.name?.toLowerCase().includes(search) || l.loc_type?.toLowerCase().includes(search)) : roots).filter(l => !autoOnly || l.auto_imported === true)

  const btnStyle = active => ({ fontSize: '0.77em', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${active ? TAB_COLOR : 'var(--brd)'}`, background: active ? `${TAB_COLOR}22` : 'none', color: active ? TAB_COLOR : 'var(--dim)' })

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: TAB_COLOR }}>🗺 Locations</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={btnStyle(view === 'tree')} onClick={() => setView('tree')}>🌳 Tree</button>
          <button style={btnStyle(view === 'table')} onClick={() => setView('table')}>☰ Table</button>
        </div>
        {autoCount > 0 && <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>📥 Auto-imported ({autoCount})</button>}
        <button className="btn btn-primary btn-sm" style={{ background: TAB_COLOR, color: '#000' }} onClick={() => openAdd()}>+ Add</button>
      </div>

      <AlphabetJumpBar entries={locations.filter(l => !autoOnly || l.auto_imported === true)} getName={e => e.name} onJump={target => scrollAndFlashEntry(target.id)} color={TAB_COLOR} />

      {!locations.length && <div className="empty"><div className="empty-icon">🗺</div><p>No locations yet.</p></div>}

      {view === 'tree' && (
        <>
          {filtered.map(l => <LocNode key={l.id} loc={l} locations={locations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />)}
          {locations.filter(l => l.parent_id && !locations.find(p => p.id === l.parent_id)).map(l => <LocNode key={l.id} loc={l} locations={locations} expanded={expanded} onToggle={toggle} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />)}
        </>
      )}

      {view === 'table' && <FlatTable locations={locations.filter(l => !autoOnly || l.auto_imported === true)} navSearch={navSearch} onEdit={e => { setEditing(e); setModalOpen(true) }} onDelete={id => setConfirmId(id)} onAddChild={openAdd} />}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id ? 'Edit' : 'Add'} Location`} color={TAB_COLOR}>
        <EntryForm fields={LOC_FIELDS} entry={editing || {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color={TAB_COLOR} db={db} />
      </Modal>

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
