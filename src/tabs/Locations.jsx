import { useState, useMemo } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import Lightbox from '../components/common/Lightbox'
import { uid, SL } from '../constants'

const LOC_FIELDS = [
  { k: 'name',        l: 'Name',             t: 'text', r: true },
  { k: 'loc_type',    l: 'Type',             t: 'sel', o: ['','World','Continent','Country','City/Town','Building','Room/Area','Landmark','Island','Body of Water','Portal','Other'] },
  { k: 'parent_id',   l: 'Inside / Part of', t: 'locsel' },
  { k: 'description', l: 'Description',      t: 'ta' },
  { k: 'image',       l: 'Image URL',        t: 'text', p: 'Paste image URL or use Browse' },
]

function locPath(id, locations) {
  const parts = []
  let cur = locations.find(l => l.id === id)
  let guard = 0
  while (cur && guard++ < 20) {
    parts.unshift(cur.name)
    cur = cur.parent_id ? locations.find(l => l.id === cur.parent_id) : null
  }
  return parts.join(' → ')
}

// ── Tree node ──────────────────────────────────────────────
function LocNode({ loc, locations, expanded, onToggle, onEdit, onDelete, onAddChild, onLightbox }) {
  const kids = locations.filter(l => l.parent_id === loc.id)
  const isOpen = expanded.has(loc.id)
  return (
    <div style={{ marginBottom:2 }}>
      <div className="loc-node" onClick={() => onToggle(loc.id)}>
        {kids.length > 0
          ? <span style={{ fontSize:9, color:'var(--cl)', display:'inline-block',
              transform: isOpen ? 'rotate(90deg)' : 'none', transition:'.2s' }}>►</span>
          : <span style={{ width:12 }} />
        }
        <span style={{ fontSize:12, fontWeight:600 }}>{loc.name}</span>
        {loc.loc_type && <span style={{ fontSize:9, color:'var(--mut)', marginLeft:6 }}>{loc.loc_type}</span>}
        {loc.status && <span className={`badge badge-${loc.status}`} style={{ marginLeft:4 }}>{SL[loc.status]||loc.status}</span>}
        {loc.image && (
          <img src={loc.image} alt=""
            style={{ width:20, height:20, objectFit:'cover', borderRadius:3,
              marginLeft:'auto', cursor:'pointer', border:'1px solid var(--brd)' }}
            onClick={e => { e.stopPropagation(); onLightbox(loc.image) }}
            onError={e => e.target.style.display='none'} />
        )}
        <span style={{ marginLeft: loc.image ? 4 : 'auto', fontSize:9, color:'var(--mut)' }}>
          {kids.length > 0 ? `${kids.length} inside` : ''}
        </span>
      </div>
      {isOpen && (
        <div style={{ padding:'6px 8px 6px 24px', fontSize:11, color:'var(--dim)' }}>
          {loc.image && (
            <img src={loc.image} alt={loc.name}
              style={{ width:'100%', maxHeight:140, objectFit:'cover',
                borderRadius:6, marginBottom:6, cursor:'pointer' }}
              onClick={() => onLightbox(loc.image)}
              onError={e => e.target.style.display='none'} />
          )}
          {loc.description && <div style={{ marginBottom:6, lineHeight:1.5 }}>{loc.description}</div>}
          {loc.notes && <div className="entry-notes">{loc.notes}</div>}
          <div className="entry-actions" style={{ marginTop:4 }}>
            <button className="btn btn-sm btn-outline"
              style={{ color:'var(--cl)', borderColor:'var(--cl)' }}
              onClick={e => { e.stopPropagation(); onEdit(loc) }}>✎ Edit</button>
            <button className="btn btn-sm btn-outline"
              style={{ color:'var(--cl)', borderColor:'var(--cl)44' }}
              onClick={e => { e.stopPropagation(); onAddChild(loc.id) }}>+ Child</button>
            <button className="btn btn-sm btn-outline"
              style={{ color:'#ff3355', borderColor:'#ff335544' }}
              onClick={e => { e.stopPropagation(); onDelete(loc.id) }}>✕</button>
          </div>
        </div>
      )}
      {isOpen && kids.length > 0 && (
        <div className="loc-children">
          {kids.map(k => (
            <LocNode key={k.id} loc={k} locations={locations} expanded={expanded}
              onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
              onAddChild={onAddChild} onLightbox={onLightbox} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Flat table ─────────────────────────────────────────────
function LocationTable({ locations, onEdit, onDelete, onLightbox }) {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [filterType, setFilterType] = useState('all')
  const [filterParent, setFilterParent] = useState('all')
  const [search, setSearch] = useState('')

  const types = ['all', ...new Set(locations.map(l => l.loc_type).filter(Boolean))]
  const parents = ['all', ...new Set(locations
    .filter(l => l.parent_id)
    .map(l => { const p = locations.find(x => x.id === l.parent_id); return p?.name })
    .filter(Boolean))]

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function parentName(id) {
    if (!id) return ''
    return locations.find(l => l.id === id)?.name || id
  }

  const filtered = useMemo(() => {
    return locations
      .filter(l => {
        const mt = filterType === 'all' || l.loc_type === filterType
        const mp = filterParent === 'all' || parentName(l.parent_id) === filterParent
        const ms = !search || JSON.stringify(l).toLowerCase().includes(search.toLowerCase())
        return mt && mp && ms
      })
      .sort((a, b) => {
        let va, vb
        if (sortKey === 'parent') { va = parentName(a.parent_id); vb = parentName(b.parent_id) }
        else { va = a[sortKey] || ''; vb = b[sortKey] || '' }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
  }, [locations, sortKey, sortDir, filterType, filterParent, search])

  const TH = ({ col, label }) => (
    <th style={{ padding:'5px 8px', textAlign:'left', fontSize:9, fontWeight:700,
      color:'var(--mut)', textTransform:'uppercase', letterSpacing:'.05em',
      cursor:'pointer', whiteSpace:'nowrap', userSelect:'none',
      borderBottom:'1px solid var(--brd)' }}
      onClick={() => toggleSort(col)}>
      {label} {sortKey===col ? (sortDir==='asc'?'▲':'▼') : ''}
    </th>
  )

  return (
    <div style={{ marginTop:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--cl)',
        fontFamily:"'Cinzel',serif", marginBottom:10,
        borderTop:'1px solid var(--brd)', paddingTop:14 }}>
        All Locations — Flat Table
      </div>

      {/* Table filters */}
      <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        <input className="sx" style={{ flex:1, minWidth:120, fontSize:11 }}
          placeholder="Search…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ fontSize:10, padding:'4px 8px', background:'var(--sf)',
            border:'1px solid var(--brd)', borderRadius:6, color:'var(--dim)' }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <select value={filterParent} onChange={e => setFilterParent(e.target.value)}
          style={{ fontSize:10, padding:'4px 8px', background:'var(--sf)',
            border:'1px solid var(--brd)', borderRadius:6, color:'var(--dim)' }}>
          {parents.map(p => <option key={p} value={p}>{p === 'all' ? 'All parents' : p}</option>)}
        </select>
      </div>

      <div style={{ fontSize:10, color:'var(--mut)', marginBottom:6 }}>
        {filtered.length} of {locations.length} locations
      </div>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead>
            <tr>
              <th style={{ width:30, padding:'5px 8px', borderBottom:'1px solid var(--brd)' }} />
              <TH col="name" label="Name" />
              <TH col="loc_type" label="Type" />
              <TH col="parent" label="Inside" />
              <TH col="status" label="Status" />
              <th style={{ padding:'5px 8px', borderBottom:'1px solid var(--brd)',
                fontSize:9, fontWeight:700, color:'var(--mut)',
                textTransform:'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr><td colSpan={6} style={{ padding:20, textAlign:'center',
                color:'var(--mut)', fontSize:11 }}>No locations match filter</td></tr>
            )}
            {filtered.map((l, i) => (
              <tr key={l.id} style={{ background: i%2===1 ? 'rgba(255,255,255,.01)' : undefined }}>
                <td style={{ padding:'4px 8px' }}>
                  {l.image && (
                    <img src={l.image} alt=""
                      style={{ width:24, height:24, objectFit:'cover', borderRadius:3,
                        cursor:'pointer', border:'1px solid var(--brd)' }}
                      onClick={() => onLightbox(l.image)}
                      onError={e => e.target.style.display='none'} />
                  )}
                </td>
                <td style={{ padding:'6px 8px', fontWeight:600 }}>{l.name}</td>
                <td style={{ padding:'6px 8px', color:'var(--cl)', fontSize:10 }}>{l.loc_type}</td>
                <td style={{ padding:'6px 8px', color:'var(--mut)', fontSize:10 }}>
                  {parentName(l.parent_id)}
                </td>
                <td style={{ padding:'6px 8px' }}>
                  {l.status && <span className={`badge badge-${l.status}`}>{SL[l.status]||l.status}</span>}
                </td>
                <td style={{ padding:'6px 8px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-sm btn-outline"
                      style={{ fontSize:9, color:'var(--cl)', borderColor:'var(--cl)44', padding:'2px 6px' }}
                      onClick={() => onEdit(l)}>✎</button>
                    <button className="btn btn-sm btn-outline"
                      style={{ fontSize:9, color:'#ff3355', borderColor:'#ff335544', padding:'2px 6px' }}
                      onClick={() => onDelete(l.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main tab ───────────────────────────────────────────────
export default function Locations({ db }) {
  const locations = db.db.locations || []
  const [expanded, setExpanded] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [lightbox, setLightbox] = useState(null)

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
    if (!editing?.id) {
      const newName = (entry.name || '').toLowerCase().trim()
      const locs = db.db.locations || []
      const dupe = locs.find(l => l.id !== entry.id && (l.name || '').toLowerCase().trim() === newName)
      if (dupe && !window.confirm(`A location named "${dupe.name}" already exists. Save anyway?`)) return
    }
    db.upsertEntry('locations', entry)
    setModalOpen(false); setEditing(null)
  }

  function handleDelete(id) {
    db.deleteEntry('locations', id)
    ;(db.db.locations || []).filter(l => l.parent_id === id).forEach(l => {
      db.upsertEntry('locations', { ...l, parent_id: '' })
    })
    setConfirmId(null)
  }

  const roots = locations.filter(l => !l.parent_id)
  const orphans = locations.filter(l => l.parent_id && !locations.find(p => p.id === l.parent_id))

  const sharedHandlers = {
    onEdit: e => { setEditing(e); setModalOpen(true) },
    onDelete: id => setConfirmId(id),
    onLightbox: setLightbox,
  }

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:'var(--cl)' }}>🗺 Locations</div>
        <button className="btn btn-primary btn-sm"
          style={{ background:'var(--cl)', color:'#000' }}
          onClick={() => openAdd()}>+ Add</button>
      </div>

      {!locations.length && (
        <div className="empty">
          <div className="empty-icon">🗺</div>
          <p>No locations yet.</p>
          <button className="btn btn-primary" style={{ background:'var(--cl)', color:'#000' }}
            onClick={() => openAdd()}>+ Add Location</button>
        </div>
      )}

      {/* Tree */}
      {roots.map(l => (
        <LocNode key={l.id} loc={l} locations={locations} expanded={expanded}
          onToggle={toggle} onAddChild={openAdd} {...sharedHandlers} />
      ))}
      {orphans.map(l => (
        <LocNode key={l.id} loc={l} locations={locations} expanded={expanded}
          onToggle={toggle} onAddChild={openAdd} {...sharedHandlers} />
      ))}

      {/* Flat table — linked, uses same handlers */}
      {locations.length > 0 && (
        <LocationTable
          locations={locations}
          onEdit={sharedHandlers.onEdit}
          onDelete={sharedHandlers.onDelete}
          onLightbox={sharedHandlers.onLightbox}
        />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id ? 'Edit' : 'Add'} Location`} color="var(--cl)">
        <EntryForm fields={LOC_FIELDS} entry={editing||{}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          color="var(--cl)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{locations.find(l=>l.id===confirmId)?.name}</strong>?<br />
              <span style={{ fontSize:10, color:'var(--mut)' }}>Children will be detached, not deleted.</span>
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
