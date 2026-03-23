import { useState } from 'react'
import Modal from './Modal'
import EntryForm from './EntryForm'
import { SL, highlight } from '../../constants'
import { uid } from '../../constants'

export default function GenericListTab({
  catKey, color, icon, label, fields, db,
  renderDetail, extraActions
}) {
  const entries = db.db[catKey] || []
  const [search, setSearch] = useState('')
  const [fB, setFB] = useState('all')
  const [fS, setFS] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const filtered = entries.filter(e => {
    const matchSearch = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
    const matchBook = fB === 'all' || (e.books || []).includes(fB)
    const matchStatus = fS === 'all' || e.status === fS
    return matchSearch && matchBook && matchStatus
  })

  function openAdd() { setEditing({}); setModalOpen(true) }
  function openEdit(e) { setEditing(e); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleSave(entry) {
    db.upsertEntry(catKey, entry)
    closeModal()
    setExpanded(entry.id)
  }

  function handleDelete(id) {
    db.deleteEntry(catKey, id)
    setConfirmId(null)
    if (expanded === id) setExpanded(null)
  }

  function badges(e) {
    const parts = []
    if (e.status) parts.push(
      <span key="s" className={`badge badge-${e.status}`}>{SL[e.status]}</span>
    )
    ;(e.books || []).forEach(b => parts.push(
      <span key={b} className="badge badge-book">{b}</span>
    ))
    if (e.flagged) parts.push(
      <span key="f" className="badge badge-flag">🚩</span>
    )
    return parts
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="tbar">
        <input
          className="sx"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="btn btn-primary btn-sm"
          style={{ background: color }}
          onClick={openAdd}
        >+ Add</button>
      </div>

      {/* Filter pills */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {['all','locked','provisional','open','exploratory'].map(s => (
            <button
              key={s}
              className={`fp ${fS === s ? 'active' : ''}`}
              style={s !== 'all' ? { color: `var(--s${s[0]})` } : {}}
              onClick={() => setFS(s)}
            >
              {s === 'all' ? 'All statuses' : SL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="cg">
        {!filtered.length && (
          <div className="empty">
            <div className="empty-icon">{icon}</div>
            <p>No {label.toLowerCase()} yet.</p>
            <button className="btn btn-primary" style={{ background: color }} onClick={openAdd}>
              + Add {label.slice(0,-1)}
            </button>
          </div>
        )}
        {filtered.map((e, i) => {
          const isOpen = expanded === e.id
          return (
            <div
              key={e.id}
              className="entry-card"
              style={{ '--card-color': color, background: i % 2 === 1 ? 'rgba(255,255,255,.01)' : undefined }}
              onClick={() => setExpanded(isOpen ? null : e.id)}
            >
              <div
                className="entry-title"
                dangerouslySetInnerHTML={{ __html: highlight(e.display_name || e.name || '', search) }}
              />
              <div className="entry-meta">{badges(e)}</div>

              {isOpen && (
                <>
                  <div className="entry-detail">
                    {renderDetail ? renderDetail(e) : (
                      fields.filter(f => f.k !== 'name' && e[f.k]).map(f => (
                        <div key={f.k} style={{ marginBottom: 3 }}>
                          <strong style={{ color, fontSize: 9, textTransform: 'uppercase' }}>{f.l}: </strong>
                          {String(e[f.k])}
                        </div>
                      ))
                    )}
                  </div>
                  {e.notes && <div className="entry-notes">{e.notes}</div>}
                  <div className="entry-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ color, borderColor: color }}
                      onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                    >✎ Edit</button>
                    {extraActions && extraActions(e)}
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ color: '#ff3355', borderColor: '#ff335544' }}
                      onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={`${editing?.id ? 'Edit' : 'Add'} ${label.slice(0,-1)}`}
        color={color}
      >
        <EntryForm
          fields={fields}
          entry={editing || {}}
          onSave={handleSave}
          onCancel={closeModal}
          color={color}
          label={label}
          db={db}
        />
      </Modal>

      {/* Confirm delete */}
      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{entries.find(e=>e.id===confirmId)?.name || 'this entry'}</strong>?<br/>
              <span style={{ fontSize: 10, color: 'var(--mut)' }}>Cannot be undone.</span>
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
