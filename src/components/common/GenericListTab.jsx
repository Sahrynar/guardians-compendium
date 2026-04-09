import { useState } from 'react'
import Modal from './Modal'
import EntryForm from './EntryForm'
import { SL, highlight } from '../../constants'
import { uid } from '../../constants'

// Column count per size label (XS = most columns = smallest cards, XL = 1 col = largest)
const SIZE_COLS = { XS: 4, S: 3, M: 2, L: 1, XL: 1 }
const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL']

export default function GenericListTab({
  catKey, color, icon, label, fields, db,
  renderDetail, extraActions, navSearch
}) {
  const entries = db.db[catKey] || []
  const [fB, setFB] = useState('all')
  const [fS, setFS] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [sortMode, setSortMode] = useState('alpha')
  const [colSize, setColSize] = useState('M')

  const search = navSearch || ''

  const filtered = entries
    .filter(e => {
      const matchSearch = !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
      const matchBook = fB === 'all' || (e.books || []).includes(fB)
      const matchStatus = fS === 'all' || e.status === fS
      return matchSearch && matchBook && matchStatus
    })
    .sort((a, b) => {
      if (sortMode === 'alpha') return (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')
      if (sortMode === 'zalpha') return (b.display_name || b.name || '').localeCompare(a.display_name || a.name || '')
      if (sortMode === 'newest') return new Date(b.created || 0) - new Date(a.created || 0)
      if (sortMode === 'oldest') return new Date(a.created || 0) - new Date(b.created || 0)
      return 0
    })

  const cols = SIZE_COLS[colSize] || 2

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

  const btnStyle = (active) => ({
    fontSize: '0.69em', padding: '2px 7px', borderRadius: 8,
    background: active ? color : 'none',
    color: active ? '#fff' : 'var(--dim)',
    border: `1px solid ${active ? color : 'var(--brd)'}`,
    cursor: 'pointer'
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="tbar">
        {/* Column size picker — XS=most cols, XL=1 col */}
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {SIZE_LABELS.map(l => (
            <button key={l} onClick={() => setColSize(l)} style={btnStyle(colSize === l)}>{l}</button>
          ))}
        </div>

        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value)}
          style={{ fontSize: '0.77em', padding: '4px 8px', borderRadius: 'var(--r)', border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)', cursor: 'pointer' }}
        >
          <option value="alpha">A → Z</option>
          <option value="zalpha">Z → A</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: color }} onClick={openAdd}>+ Add</button>
      </div>

      {/* Status filter pills */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {['all','locked','provisional','open','exploratory'].map(s => (
            <button
              key={s}
              className={`fp ${fS === s ? 'active' : ''}`}
              style={fS === s ? { color, borderColor: color } : {}}
              onClick={() => setFS(s)}
            >
              {s === 'all' ? 'All statuses' : SL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: cols > 1 ? `repeat(${cols}, minmax(0, 1fr))` : '1fr',
        gap: 6
      }}>
        {!filtered.length && (
          <div className="empty" style={{ gridColumn: `1 / -1` }}>
            <div className="empty-icon">{icon}</div>
            <p>No {label.toLowerCase()} yet.</p>
            <button className="btn btn-primary" style={{ background: color }} onClick={openAdd}>
              + Add {label.slice(0, -1)}
            </button>
          </div>
        )}
        {filtered.map((e, i) => {
          const isOpen = expanded === e.id
          return (
            <div
              key={e.id}
              className="entry-card"
              style={{ '--card-color': color }}
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
                          <strong style={{ color, fontSize: '0.69em', textTransform: 'uppercase' }}>{f.l}: </strong>
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
        title={`${editing?.id ? 'Edit' : 'Add'} ${label.slice(0, -1)}`}
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
            <p>Delete <strong>{entries.find(e => e.id === confirmId)?.name || 'this entry'}</strong>?<br />
              <span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>Cannot be undone.</span>
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirmId)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
