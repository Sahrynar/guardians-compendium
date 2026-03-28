import { useState } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

export default function Flags({ db }) {
  const flags = db.db.flags || []
  const [filter, setFilter] = useState('active')
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('fl_cols') || '2'))
  function saveColCount(n) { setColCount(n); db.saveSetting?.('fl_cols', String(n)) } // 'active' | 'resolved' | 'all'
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'high', detail: '' })
  const [confirmId, setConfirmId] = useState(null)

  const filtered = flags.filter(f => {
    if (filter === 'active') return !f.resolved
    if (filter === 'resolved') return !!f.resolved
    return true
  }).sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 }
    return (order[a.priority||'']||4) - (order[b.priority||'']||4)
  })

  const priCol = { urgent: '#ff3355', high: '#ff7040', medium: '#ffcc00', low: '#7acc7a' }

  function addFlag() {
    if (!form.name.trim()) return
    db.upsertEntry('flags', { id: uid(), ...form, resolved: false, created: new Date().toISOString() })
    setForm({ name: '', priority: 'high', detail: '' })
    setModalOpen(false)
  }

  function resolve(f) {
    db.upsertEntry('flags', { ...f, resolved: true, resolved_at: new Date().toISOString() })
  }

  function reopen(f) {
    db.upsertEntry('flags', { ...f, resolved: false, resolved_at: null })
  }

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cfl)' }}>🚩 Flags & Review</div>
        <div style={{ display:'flex', gap:3 }}>
          {[['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
            <button key={l} onClick={() => saveColCount(n)}
              style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
                background: colCount===n ? 'var(--cfl)' : 'none',
                color: colCount===n ? '#000' : 'var(--dim)',
                border: `1px solid ${colCount===n ? 'var(--cfl)' : 'var(--brd)'}`,
                cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cfl)', color: '#000' }} onClick={() => setModalOpen(true)}>+ Add Flag</button>
      </div>

      {/* Filter */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {[['active','Active'],['resolved','Resolved'],['all','All']].map(([k,l]) => (
            <button key={k} className={`fp ${filter===k?'active':''}`} style={{ color: 'var(--cfl)' }} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--mut)', marginLeft: 8 }}>
          {flags.filter(f => !f.resolved).length} active · {flags.filter(f => f.resolved).length} resolved
        </span>
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🚩</div>
          <p>{filter === 'resolved' ? 'No resolved flags.' : filter === 'active' ? 'No active flags!' : 'No flags.'}</p>
        </div>
      )}

      <div style={{ columns: colCount, columnGap: 10, columnRule: 'var(--brd) 1px solid' }}>
      {filtered.map(f => {
        const pc = priCol[f.priority] || 'var(--dim)'
        return (
          <div key={f.id} className="flag-card" style={{ opacity: f.resolved ? 0.6 : 1, breakInside: 'avoid', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: f.resolved ? 'var(--dim)' : 'var(--tx)', textDecoration: f.resolved ? 'line-through' : 'none' }}>
                {f.name}
              </div>
              <span className="flag-pri" style={{ background: `${pc}22`, color: pc, border: `1px solid ${pc}44` }}>
                {f.priority || 'none'}
              </span>
            </div>
            {f.detail && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>{f.detail}</div>}
            {f.resolved && f.resolved_at && (
              <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 3 }}>Resolved {new Date(f.resolved_at).toLocaleDateString()}</div>
            )}
            <div className="entry-actions" style={{ marginTop: 4 }}>
              {!f.resolved
                ? <button className="btn btn-sm btn-outline" style={{ color: 'var(--sl)', borderColor: 'var(--sl)' }} onClick={() => resolve(f)}>✓ Resolve</button>
                : <button className="btn btn-sm btn-outline" style={{ color: 'var(--sp)', borderColor: 'var(--sp)' }} onClick={() => reopen(f)}>↩ Reopen</button>
              }
              <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(f.id)}>✕ Delete</button>
            </div>
          </div>
        )
      })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Flag" color="var(--cfl)">
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
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--cfl)', color: '#000' }} onClick={addFlag}>Add Flag</button>
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
