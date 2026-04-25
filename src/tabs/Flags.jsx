import { useEffect, useState } from 'react'
import Modal from '../components/common/Modal'
import { TAB_RAINBOW, uid } from '../constants'
import { scrollAndFlashEntry } from '../components/common/entryNav'

export default function Flags({ db }) {
  const tabColor = TAB_RAINBOW['flags'] || '#aaaaaa'
  const flags = db.db.flags || []
  const [filter, setFilter] = useState('active')
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('fl_cols') || '2'))
  const [dividers, setDividers] = useState(() => db.getSetting?.('fl_cols_div') !== 'off')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'high', detail: '' })
  const [confirmId, setConfirmId] = useState(null)
  const [sortMode, setSortMode] = useState('newest')
  const [autoOnly, setAutoOnly] = useState(false)

  const autoCount = flags.filter(f => f.auto_imported === true).length
  const priCol = { urgent: '#ff3355', high: '#ff7040', medium: '#ffcc00', low: '#7acc7a' }

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = flags.find(x => x.id === targetId)
      if (!entry) return
      setForm(entry)
      setModalOpen(true)
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [flags])

  function saveColCount(n) { setColCount(n); db.saveSetting?.('fl_cols', String(n)) }
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('fl_cols_div', next ? 'on' : 'off') }

  const filtered = flags.filter(f => {
    if (filter === 'active') return !f.resolved && (!autoOnly || f.auto_imported === true)
    if (filter === 'resolved') return !!f.resolved && (!autoOnly || f.auto_imported === true)
    return !autoOnly || f.auto_imported === true
  }).sort((a, b) => {
    if (sortMode === 'alpha') return (a.name || '').localeCompare(b.name || '')
    if (sortMode === 'oldest') return new Date(a.created || 0) - new Date(b.created || 0)
    if (sortMode === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority || ''] || 4) - (order[b.priority || ''] || 4)
    }
    return new Date(b.created || 0) - new Date(a.created || 0)
  })

  function saveFlag() {
    if (!form.name?.trim()) return
    const now = new Date().toISOString()
    const next = { id: form.id || uid(), resolved: false, created: form.created || now, updated_at: now, ...form }
    db.upsertEntry('flags', next)
    setForm({ name: '', priority: 'high', detail: '' })
    setModalOpen(false)
  }

  function resolve(f) { db.upsertEntry('flags', { ...f, resolved: true, resolved_at: new Date().toISOString() }) }
  function reopen(f) { db.upsertEntry('flags', { ...f, resolved: false, resolved_at: null }) }

  return (
    <div>
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: tabColor }}>🚩 Flags & Review</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {[['XS', 8], ['S', 5], ['M', 3], ['L', 2], ['XL', 1]].map(([l, n]) => (
            <button key={l} onClick={() => saveColCount(n)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: colCount === n ? tabColor : 'none', color: colCount === n ? '#000' : 'var(--dim)', border: `1px solid ${colCount === n ? tabColor : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
          <button onClick={toggleDividers} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, marginLeft: 8, background: dividers ? 'rgba(255,255,255,.08)' : 'none', color: dividers ? 'var(--tx)' : 'var(--mut)', border: '1px solid var(--brd)', cursor: 'pointer' }}>{dividers ? '┃ on' : '┃ off'}</button>
        </div>
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{ background: tabColor, color: '#000' }} onClick={() => { setForm({ name: '', priority: 'high', detail: '' }); setModalOpen(true) }}>+ Add Flag</button>
      </div>

      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          {[['active', 'Active'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => <button key={k} className={`fp ${filter === k ? 'active' : ''}`} style={{ color: tabColor }} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <span style={{ fontSize: '0.77em', color: 'var(--mut)', marginLeft: 8 }}>{flags.filter(f => !f.resolved).length} active · {flags.filter(f => f.resolved).length} resolved</span>
      </div>

      {!filtered.length && <div className="empty"><div className="empty-icon">🚩</div><p>{filter === 'resolved' ? 'No resolved flags.' : filter === 'active' ? 'No active flags!' : 'No flags.'}</p></div>}

      <div style={{ columns: colCount, columnGap: 12, columnRule: dividers ? '1px solid var(--brd)' : 'none' }}>
        {filtered.map(f => {
          const pc = priCol[f.priority] || 'var(--dim)'
          return (
            <div key={f.id} id={`gcomp-entry-${f.id}`} className="flag-card" style={{ opacity: f.resolved ? 0.6 : 1, breakInside: 'avoid', marginBottom: 6, borderLeft: `3px solid ${tabColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.92em', fontWeight: 600, color: f.resolved ? 'var(--dim)' : 'var(--tx)', textDecoration: f.resolved ? 'line-through' : 'none' }}>{f.name}</div>
                <span className="flag-pri" style={{ background: `${pc}22`, color: pc, border: `1px solid ${pc}44` }}>{f.priority || 'none'}</span>
              </div>
              {f.detail && <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 3 }}>{f.detail}</div>}
              {f.resolved && f.resolved_at && <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 3 }}>Resolved {new Date(f.resolved_at).toLocaleDateString()}</div>}
              <div className="entry-actions" style={{ marginTop: 4 }}>
                {!f.resolved
                  ? <button className="btn btn-sm btn-outline" style={{ color: 'var(--sl)', borderColor: 'var(--sl)' }} onClick={() => resolve(f)}>✓ Resolve</button>
                  : <button className="btn btn-sm btn-outline" style={{ color: 'var(--sp)', borderColor: 'var(--sp)' }} onClick={() => reopen(f)}>↩ Reopen</button>
                }
                <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor }} onClick={() => { setForm(f); setModalOpen(true) }}>✎ Edit</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(f.id)}>✕ Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Flag' : 'Add Flag'} color={tabColor}>
        <div className="field"><label>Description *</label><input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="What needs attention?" /></div>
        <div className="field"><label>Priority</label><select value={form.priority || 'high'} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>{['urgent', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div className="field"><label>Detail</label><textarea value={form.detail || ''} onChange={e => setForm(p => ({ ...p, detail: e.target.value }))} placeholder="Optional detail..." /></div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: tabColor, color: '#000' }} onClick={saveFlag}>{form.id ? 'Save Flag' : 'Add Flag'}</button>
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
