import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, uid, SL } from '../constants'

const ITEM_FIELDS = [
  { k: 'name',        l: 'Name',            t: 'text', r: true },
  { k: 'holder',      l: 'Current Holder',  t: 'charsel' },
  { k: 'shared_with', l: 'Shared With',     t: 'charsel', p: 'If item passes freely between two people' },
  { k: 'origin',      l: 'Origin',          t: 'text' },
  { k: 'significance',l: 'Significance',    t: 'ta' },
]

export default function Items({ db }) {
  const items = db.db.items || []
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [transferId, setTransferId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [txForm, setTxForm] = useState({ to: '', note: '', when: '' })

  const filtered = items.filter(e =>
    !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
  )

  function holderName(id) {
    const ch = (db.db.characters || []).find(c => c.id === id)
    return ch ? ch.name : id
  }

  function handleSave(entry) {
    db.upsertEntry('items', entry)
    setModalOpen(false); setEditing(null)
    setExpanded(entry.id)
  }

  function doTransfer() {
    const item = items.find(x => x.id === transferId)
    if (!item || !txForm.to) return
    const transfers = [...(item.transfers || []), { from: holderName(item.holder) || '?', to: txForm.to, note: txForm.note, when: txForm.when }]
    const chars = db.db.characters || []
    const toChar = chars.find(c => c.name === txForm.to || c.id === txForm.to)
    db.upsertEntry('items', { ...item, holder: toChar ? toChar.id : txForm.to, transfers })
    setTransferId(null); setTxForm({ to: '', note: '', when: '' })
  }

  return (
    <div>
      <div className="tbar">
        <input className="sx" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--ci)' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      <div className="cg">
        {!filtered.length && (
          <div className="empty"><div className="empty-icon">⚔</div><p>No items yet.</p></div>
        )}
        {filtered.map((e, i) => {
          const isOpen = expanded === e.id
          const holder = holderName(e.holder)
          return (
            <div key={e.id} className="entry-card" style={{ '--card-color': 'var(--ci)', background: i%2===1?'rgba(255,255,255,.01)':undefined }} onClick={() => setExpanded(isOpen ? null : e.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.name || '', search) }} />
                {holder && <div style={{ fontSize: 10, color: 'var(--ci)' }}>{holder}</div>}
              </div>
              <div className="entry-meta">
                {e.status && <span className={`badge badge-${e.status}`}>{SL[e.status]}</span>}
                {(e.books||[]).map(b => <span key={b} className="badge badge-book">{b}</span>)}
              </div>
              {isOpen && (
                <>
                  <div className="entry-detail">
                    {e.origin && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Origin: </strong>{e.origin}</div>}
                    {e.significance && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Significance: </strong>{e.significance}</div>}
                    {e.shared_with && <div style={{ marginBottom: 3 }}><strong style={{ color: 'var(--ci)', fontSize: 9, textTransform: 'uppercase' }}>Shared with: </strong>{holderName(e.shared_with)}</div>}
                    {(e.transfers||[]).length > 0 && (
                      <details style={{ marginTop: 6 }} onClick={ev => ev.stopPropagation()}>
                        <summary style={{ fontSize: 10, color: 'var(--ci)', cursor: 'pointer' }}>Transfer History ({e.transfers.length})</summary>
                        {e.transfers.map((t, ti) => (
                          <div key={ti} style={{ fontSize: 10, color: 'var(--dim)', padding: '2px 0' }}>
                            {t.from || '?'} → {t.to || '?'}{t.note ? ` · ${t.note}` : ''}{t.when ? <span style={{ color: 'var(--mut)' }}> ({t.when})</span> : ''}
                          </div>
                        ))}
                      </details>
                    )}
                  </div>
                  {e.notes && <div className="entry-notes">{e.notes}</div>}
                  <div className="entry-actions">
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--ci)', borderColor: 'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--ci)', borderColor: 'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setTransferId(e.id) }}>↔ Transfer</button>
                    <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id ? 'Edit' : 'Add'} Item`} color="var(--ci)">
        <EntryForm fields={ITEM_FIELDS} entry={editing || {}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--ci)" db={db} />
      </Modal>

      <Modal open={!!transferId} onClose={() => setTransferId(null)} title="Transfer Item" color="var(--ci)">
        <div className="field"><label>Transfer To</label>
          <select value={txForm.to} onChange={e => setTxForm(p => ({ ...p, to: e.target.value }))}>
            <option value="">— Pick character —</option>
            {(db.db.characters||[]).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Note (optional)</label><input value={txForm.note} onChange={e => setTxForm(p => ({ ...p, note: e.target.value }))} /></div>
        <div className="field"><label>When (e.g. "End of Book 1")</label><input value={txForm.when} onChange={e => setTxForm(p => ({ ...p, when: e.target.value }))} /></div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setTransferId(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--ci)' }} onClick={doTransfer}>Transfer</button>
        </div>
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{items.find(e=>e.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('items', confirmId); setConfirmId(null); if (expanded === confirmId) setExpanded(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
