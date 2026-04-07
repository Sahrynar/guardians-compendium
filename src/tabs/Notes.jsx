import { useState } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

const NOTE_CATS = ['General', 'Canon', 'Brainstorm', 'Research', 'Todo', 'Quote', 'Other']

function fmtDT(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
}

export default function Notes({ db }) {
  const notes = db.db.notes || []
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [viewNote, setViewNote] = useState(null)

  const filtered = notes.filter(n => {
    const ms = !search || JSON.stringify(n).toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || n.category === catFilter
    return ms && mc
  }).sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))

  const usedCats = [...new Set(notes.map(n => n.category).filter(Boolean))]

  function handleSave(form) {
    const now = new Date().toISOString()
    const entry = {
      ...form,
      id: form.id || uid(),
      updated: now,
      created: form.created || now,
    }
    db.upsertEntry('notes', entry)
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: 'var(--cw)' }}>📝 Notes & Lore</div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cw)', color: '#000' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ New Note</button>
      </div>

      <div className="tbar" style={{ padding: '0 0 8px' }}>
        <input className="sx" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
        <button className={`fp ${catFilter==='all'?'active':''}`} style={{ color: 'var(--cw)' }} onClick={() => setCatFilter('all')}>All</button>
        {usedCats.map(c => (
          <button key={c} className={`fp ${catFilter===c?'active':''}`} style={{ color: 'var(--cw)' }} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <p>No notes yet.</p>
          <button className="btn btn-primary" style={{ background: 'var(--cw)', color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Note</button>
        </div>
      )}

      <div className="cg">
        {filtered.map((n, i) => (
          <div key={n.id} className="entry-card"
            style={{ '--card-color': 'var(--cw)', background: i%2===1?'rgba(255,255,255,.01)':undefined, cursor: 'pointer' }}
            onClick={() => setViewNote(n)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {n.title && <div className="entry-title" style={{ fontSize: '1em' }}>{n.title}</div>}
              {n.category && (
                <span className="badge" style={{ color: 'var(--cw)', borderColor: 'rgba(255,204,0,.3)', flexShrink: 0, marginLeft: 8 }}>{n.category}</span>
              )}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--dim)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
              {n.content?.length > 200 ? n.content.slice(0, 200) + '…' : n.content}
            </div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 6 }}>
              {n.updated ? fmtDT(n.updated) : fmtDT(n.created)}
            </div>
            <div className="entry-actions" onClick={e => e.stopPropagation()}>
              <button className="btn btn-sm btn-outline" style={{ color: 'var(--cw)', borderColor: 'var(--cw)' }}
                onClick={() => { setEditing(n); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
                onClick={() => setConfirmId(n.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* View popup */}
      {viewNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setViewNote(null)}>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--cw)44', borderRadius: 12,
            padding: 20, maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                {viewNote.title && (
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', color: 'var(--cw)', marginBottom: 4 }}>{viewNote.title}</div>
                )}
                {viewNote.category && (
                  <span className="badge" style={{ color: 'var(--cw)', borderColor: 'rgba(255,204,0,.3)' }}>{viewNote.category}</span>
                )}
              </div>
              <button onClick={() => setViewNote(null)}
                style={{ background: 'none', border: 'none', color: 'var(--mut)', fontSize: '1.38em', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
              {viewNote.content}
            </div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', borderTop: '1px solid var(--brd)', paddingTop: 8 }}>
              {viewNote.created && `Created ${fmtDT(viewNote.created)}`}
              {viewNote.updated && viewNote.updated !== viewNote.created && ` · Edited ${fmtDT(viewNote.updated)}`}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--cw)', borderColor: 'var(--cw)' }}
                onClick={() => { setViewNote(null); setEditing(viewNote); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => setViewNote(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing?.id ? 'Edit Note' : 'Add Note'} color="var(--cw)">
        {(editing !== null) && (
          <NoteForm note={editing} onSave={handleSave}
            onCancel={() => { setModalOpen(false); setEditing(null) }} cats={NOTE_CATS} />
        )}
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete this note?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm"
              onClick={() => { db.deleteEntry('notes', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteForm({ note, onSave, onCancel, cats }) {
  const [form, setForm] = useState({ title: '', category: 'General', content: '', ...note })
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <>
      <div className="field-row">
        <div className="field"><label>Title (optional)</label>
          <input value={form.title} onChange={s('title')} placeholder="Note title…" /></div>
        <div className="field"><label>Category</label>
          <select value={form.category} onChange={s('category')}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Content *</label>
        <textarea value={form.content} onChange={s('content')} placeholder="Write your note…" style={{ minHeight: 120 }} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--cw)', color: '#000' }}
          onClick={() => onSave(form)}>{note.id ? 'Save' : 'Add Note'}</button>
      </div>
    </>
  )
}
