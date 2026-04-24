import { useEffect, useState } from 'react'
import Modal from './Modal'
import EntryForm from './EntryForm'
import AlphabetJumpBar from './AlphabetJumpBar'
import { SL, highlight } from '../../constants'
import { scrollAndFlashEntry } from './entryNav'

const SIZE_COLS = { XS: 5, S: 4, M: 3, L: 2, XL: 1 }

export default function GenericListTab({
  catKey, color, icon, label, fields, db,
  renderDetail, extraActions,
  columns, columnRule,
  navSearch,
  getJumpName,
}) {
  const entries = db.db[catKey] || []
  const [search, setSearch] = useState('')
  const [colSize, setColSize] = useState(() => {
    try { return localStorage.getItem(`colsize_${label}`) || 'M' } catch { return 'M' }
  })
  const [fS, setFS] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [sortMode, setSortMode] = useState('alpha')
  const [autoOnly, setAutoOnly] = useState(false)
  const cols = SIZE_COLS[colSize] || 3
  const autoCount = entries.filter(e => e.auto_imported === true).length

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = entries.find(x => x.id === targetId)
      if (!entry) return
      setExpanded(targetId)
      setEditing(entry)
      setModalOpen(true)
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [entries])

  function changeColSize(sz) {
    setColSize(sz)
    try { localStorage.setItem(`colsize_${label}`, sz) } catch {}
  }

  const filtered = entries
    .filter(e => {
      const matchSearch = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
      const matchStatus = fS === 'all' || e.status === fS
      const matchAuto = !autoOnly || e.auto_imported === true
      return matchSearch && matchStatus && matchAuto
    })
    .sort((a, b) => {
      const aName = a.display_name || a.name || a.word || ''
      const bName = b.display_name || b.name || b.word || ''
      if (sortMode === 'alpha') return aName.localeCompare(bName)
      if (sortMode === 'newest') return new Date(b.updated_at || b.updated || b.created || 0) - new Date(a.updated_at || a.updated || a.created || 0)
      if (sortMode === 'oldest') return new Date(a.updated_at || a.updated || a.created || 0) - new Date(b.updated_at || b.updated || b.created || 0)
      return 0
    })

  function openAdd() { setEditing({}); setModalOpen(true) }
  function openEdit(e) { setEditing(e); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleSave(entry) {
    const stamped = { ...entry, updated_at: new Date().toISOString() }
    if (!editing?.id) stamped.created = stamped.created || stamped.updated_at
    db.upsertEntry(catKey, stamped)
    closeModal()
    setExpanded(stamped.id)
  }

  function handleDelete(id) {
    db.deleteEntry(catKey, id)
    setConfirmId(null)
    if (expanded === id) setExpanded(null)
  }

  function badges(e) {
    const parts = []
    if (e.status) parts.push(<span key="s" className={`badge badge-${e.status}`}>{SL[e.status]}</span>)
    if (e.flagged) parts.push(<span key="f" className="badge badge-flag">🚩</span>)
    if (e.auto_imported) parts.push(<span key="a" className="badge" style={{ color: '#ffcc00', borderColor: 'rgba(255,204,0,.35)' }}>📥 Auto-imported</span>)
    return parts
  }

  function fmtDate(iso) {
    if (!iso) return null
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return null }
  }

  const listStyle = columns && columns > 1 ? { columns, columnGap: 10, columnRule: columnRule || 'none' } : {}

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3 }}>
          {['XS', 'S', 'M', 'L', 'XL'].map(sz => (
            <button key={sz} onClick={() => changeColSize(sz)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, cursor: 'pointer', background: colSize === sz ? color : 'none', color: colSize === sz ? '#000' : 'var(--dim)', border: `1px solid ${colSize === sz ? color : 'var(--brd)'}` }}>{sz}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
        <select value={sortMode} onChange={e => setSortMode(e.target.value)} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--r)', border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)', cursor: 'pointer' }} title="Sort order">
          <option value="alpha">A → Z</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: color }} onClick={openAdd}>+ Add</button>
      </div>

      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {['all', 'locked', 'provisional', 'open', 'exploratory'].map(s => (
            <button key={s} className={`fp ${fS === s ? 'active' : ''}`} style={s !== 'all' ? { color: `var(--s${s[0]})` } : {}} onClick={() => setFS(s)}>
              {s === 'all' ? 'All statuses' : SL[s]}
            </button>
          ))}
        </div>
      </div>

      {getJumpName && filtered.length > 0 && (
        <AlphabetJumpBar entries={filtered} getName={getJumpName} onJump={target => scrollAndFlashEntry(target.id)} color={color} />
      )}

      <div className="cg" style={listStyle}>
        {!filtered.length && (
          <div className="empty">
            <div className="empty-icon">{icon}</div>
            <p>No {label.toLowerCase()} yet.</p>
            <button className="btn btn-primary" style={{ background: color }} onClick={openAdd}>+ Add {label.slice(0, -1)}</button>
          </div>
        )}
        {filtered.map((e, i) => {
          const isOpen = expanded === e.id
          const ts = e.updated_at || e.updated || e.created
          return (
            <div key={e.id} id={`gcomp-entry-${e.id}`} className="entry-card" style={{ '--card-color': color, background: i % 2 === 1 ? 'rgba(255,255,255,.01)' : undefined, breakInside: 'avoid', marginBottom: 6 }} onClick={() => setExpanded(isOpen ? null : e.id)}>
              <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.display_name || e.name || e.word || '', search) }} />
              <div className="entry-meta">{badges(e)}</div>

              {isOpen && (
                <>
                  <div className="entry-detail">
                    {renderDetail ? renderDetail(e) : fields.filter(f => f.k !== 'name' && e[f.k]).map(f => (
                      <div key={f.k} style={{ marginBottom: 3 }}>
                        <strong style={{ color, fontSize: 'var(--fs-xs)', textTransform: 'uppercase' }}>{f.l}: </strong>
                        {String(e[f.k])}
                      </div>
                    ))}
                  </div>
                  {e.notes && <div className="entry-notes">{e.notes}</div>}
                  {ts && <div className="entry-timestamp">{e.updated_at && e.updated_at !== e.created ? `Edited ${fmtDate(e.updated_at)}` : e.created ? `Added ${fmtDate(e.created)}` : ''}</div>}
                  <div className="entry-actions">
                    <button className="btn btn-sm btn-outline" style={{ color, borderColor: color }} onClick={ev => { ev.stopPropagation(); openEdit(e) }}>✎ Edit</button>
                    {extraActions && extraActions(e)}
                    <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={`${editing?.id ? 'Edit' : 'Add'} ${label.slice(0, -1)}`} color={color}>
        <EntryForm fields={fields} entry={editing || {}} onSave={handleSave} onCancel={closeModal} color={color} label={label} db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{entries.find(e => e.id === confirmId)?.name || 'this entry'}</strong>?<br /><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--mut)' }}>Cannot be undone.</span></p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
