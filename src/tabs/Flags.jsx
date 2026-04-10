import { useState, useEffect } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

const FLAG_COLOR = '#9d4edd'
const SIZE_COLS = { XS: 3, S: 2, M: 1, L: 1, XL: 1 }
const SIZE_LABELS = ['XS', 'S', 'M']

export default function Flags({ db, navSearch }) {
  const flags = db.db.flags || []
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [colSize, setColSize] = useState('M')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', priority: 'high', detail: '' })
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  const filtered = flags.filter(f => {
    const matchFilter = filter === 'all' || (filter === 'active' ? !f.resolved : !!f.resolved)
    const matchSearch = !search || JSON.stringify(f).toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  }).sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 }
    return (order[a.priority||'']||4) - (order[b.priority||'']||4)
  })

  const priCol = { urgent: '#ff3355', high: '#ff7040', medium: '#ffcc00', low: '#7acc7a' }

  function openAdd() { setForm({ name: '', priority: 'high', detail: '' }); setEditing(null); setModalOpen(true) }
  function openEdit(f) { setForm({ name: f.name, priority: f.priority||'high', detail: f.detail||'' }); setEditing(f); setModalOpen(true) }

  function saveFlag() {
    if (!form.name.trim()) return
    if (editing) {
      db.upsertEntry('flags', { ...editing, ...form })
    } else {
      db.upsertEntry('flags', { id: uid(), ...form, resolved: false, created: new Date().toISOString() })
    }
    setModalOpen(false); setEditing(null)
  }

  function resolve(f) { db.upsertEntry('flags', { ...f, resolved: true, resolved_at: new Date().toISOString() }) }
  function reopen(f) { db.upsertEntry('flags', { ...f, resolved: false, resolved_at: null }) }

  const cols = SIZE_COLS[colSize] || 1
  const btnStyle = (active) => ({
    fontSize: '0.69em', padding: '2px 7px', borderRadius: 8,
    background: active ? FLAG_COLOR : 'none',
    color: active ? '#fff' : 'var(--dim)',
    border: `1px solid ${active ? FLAG_COLOR : 'var(--brd)'}`, cursor: 'pointer'
  })

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {SIZE_LABELS.map(l => <button key={l} onClick={() => setColSize(l)} style={btnStyle(colSize === l)}>{l}</button>)}
        </div>
        <input className="sx" placeholder="Search flags…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="btn btn-primary btn-sm" style={{ background: FLAG_COLOR }} onClick={openAdd}>+ Add Flag</button>
      </div>

      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {[['active','Active'],['resolved','Resolved'],['all','All']].map(([k,l]) => (
            <button key={k} className={`fp ${filter===k?'active':''}`}
              style={filter===k ? { color: FLAG_COLOR, borderColor: FLAG_COLOR } : {}}
              onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>
          {flags.filter(f => !f.resolved).length} active · {flags.filter(f => f.resolved).length} resolved
        </span>
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🚩</div>
          <p>{search ? 'No flags match your search.' : filter === 'resolved' ? 'No resolved flags.' : filter === 'active' ? 'No active flags!' : 'No flags.'}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: cols > 1 ? `repeat(${cols}, 1fr)` : '1fr', gap: 6 }}>
        {filtered.map(f => {
          const pc = priCol[f.priority] || 'var(--dim)'
          return (
            <div key={f.id} className="flag-card" style={{ opacity: f.resolved ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: '0.92em', fontWeight: 600, color: f.resolved ? 'var(--dim)' : 'var(--tx)', textDecoration: f.resolved ? 'line-through' : 'none' }}>
                  {f.name}
                </div>
                <span className="flag-pri" style={{ background: `${pc}22`, color: pc, border: `1px solid ${pc}44`, flexShrink: 0 }}>
                  {f.priority || 'none'}
                </span>
              </div>
              {f.detail && <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 3 }}>{f.detail}</div>}
              {f.resolved && f.resolved_at && (
                <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 3 }}>
                  Resolved {new Date(f.resolved_at).toLocaleDateString()}
                </div>
              )}
              <div className="entry-actions" style={{ marginTop: 4 }}>
                {!f.resolved
                  ? <button className="btn btn-sm btn-outline" style={{ color: 'var(--sl)', borderColor: 'var(--sl)' }} onClick={() => resolve(f)}>✓ Resolve</button>
                  : <button className="btn btn-sm btn-outline" style={{ color: 'var(--sp)', borderColor: 'var(--sp)' }} onClick={() => reopen(f)}>↩ Reopen</button>
                }
                <button className="btn btn-sm btn-outline" style={{ color: FLAG_COLOR, borderColor: FLAG_COLOR }} onClick={() => openEdit(f)}>✎ Edit</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(f.id)}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Edit Flag' : 'Add Flag'} color={FLAG_COLOR}>
        <div className="field"><label>Description *</label>
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="What needs attention?" />
        </div>
        <div className="field"><label>Priority</label>
          <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
            {['urgent','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field"><label>Detail</label>
          <textarea value={form.detail} onChange={e => setForm(p => ({...p, detail: e.target.value}))} placeholder="Optional detail…" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancel</button>
          <button className="btn btn-primary" style={{ background: FLAG_COLOR }} onClick={saveFlag}>
            {editing ? 'Save' : 'Add Flag'}
          </button>
        </div>
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Permanently delete this flag?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('flags', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
