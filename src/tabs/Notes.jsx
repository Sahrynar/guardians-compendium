import { useState, useEffect } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

const NOTES_COLOR = '#ffcc00'
const SIZE_COLS_N = { XS: 4, S: 3, M: 2, L: 1, XL: 1 }
const SIZE_LABELS_N = ['XS', 'S', 'M', 'L']

const NOTE_CATS = ['General', 'Canon', 'Brainstorm', 'Research', 'Todo', 'Quote', 'Other']

export default function Notes({ db, navSearch }) {
  const notes = db.db.notes || []
  const [search, setSearch] = useState('')

  // Sync top nav search
  useEffect(() => { setSearch(navSearch || '') }, [navSearch])
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [colSize, setColSize] = useState(() => { try { return localStorage.getItem('colsize_notes') || 'M' } catch { return 'M' } })
  const [viewNote, setViewNote] = useState(null)
  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_notes', sz) } catch {} }

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  const filtered = notes.filter(n => {
    const ms = !search || JSON.stringify(n).toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || n.category === catFilter
    return ms && mc
  }).sort((a, b) => new Date(b.updated||0) - new Date(a.updated||0))

  const usedCats = [...new Set(notes.map(n => n.category).filter(Boolean))]

  function handleSave(form) {
    db.upsertEntry('notes', { ...form, id: form.id || uid(), updated: new Date().toISOString() })
    setModalOpen(false); setEditing(null)
  }

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {SIZE_LABELS_N.map(l => (
            <button key={l} onClick={() => changeColSize(l)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: colSize===l ? NOTES_COLOR : 'none', color: colSize===l ? '#000' : 'var(--dim)', border: `1px solid ${colSize===l ? NOTES_COLOR : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em', color: NOTES_COLOR }}>📝 Notes & Lore</div>
        <button className="btn btn-primary btn-sm" style={{ background: NOTES_COLOR, color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ New Note</button>
      </div>

      <div className="tbar" style={{ padding: '0 0 8px' }}>
        <input className="sx" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
        <button className={`fp ${catFilter==='all'?'active':''}`} style={{ color: '#ff6b6b' }} onClick={() => setCatFilter('all')}>All</button>
        {usedCats.map(c => (
          <button key={c} className={`fp ${catFilter===c?'active':''}`} style={{ color: '#ff6b6b' }} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <p>No notes yet.</p>
          <p style={{ fontSize: '0.85em', color: 'var(--mut)', maxWidth: 300, margin: '8px auto' }}>For quick notes, brainstorms, canon reminders, research snippets, and anything that doesn't fit elsewhere.</p>
          <button className="btn btn-primary" style={{ background: '#ff6b6b', color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Note</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: SIZE_COLS_N[colSize] > 1 ? `repeat(${SIZE_COLS_N[colSize]}, minmax(0,1fr))` : '1fr', gap: 6 }}>
        {filtered.map((n, i) => (
          <div key={n.id} className="entry-card" style={{ '--card-color': 'var(--cw)', background: i%2===1?'rgba(255,255,255,.01)':undefined, cursor: 'pointer' }}
            onClick={() => setViewNote(n)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {n.title && <div className="entry-title" style={{ fontSize: '1em' }}>{n.title}</div>}
              {n.category && <span className="badge" style={{ color: '#ff6b6b', borderColor: 'rgba(255,204,0,.3)', flexShrink: 0, marginLeft: 8 }}>{n.category}</span>}
            </div>
            <div style={{ fontSize: '0.92em', color: 'var(--dim)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
              {n.content?.length > 300 ? n.content.slice(0, 300) + '…' : n.content}
            </div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 6 }}>
              {n.updated ? new Date(n.updated).toLocaleString() : ''}
            </div>
            <div className="entry-actions">
              <button className="btn btn-sm btn-outline" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={() => { setEditing(n); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(n.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>


      {/* View popup */}
      {viewNote && (
        <div className="modal-overlay open" onClick={() => setViewNote(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <button className="modal-close" onClick={() => setViewNote(null)}>✕</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              {viewNote.title && <div className="modal-title" style={{ color: NOTES_COLOR }}>{viewNote.title}</div>}
              {viewNote.category && <span className="badge" style={{ color: NOTES_COLOR, borderColor: 'rgba(255,204,0,.3)' }}>{viewNote.category}</span>}
            </div>
            <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{viewNote.content}</div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 12 }}>
              {viewNote.updated ? new Date(viewNote.updated).toLocaleString() : ''}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setViewNote(null); setEditing(viewNote); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-outline" onClick={() => setViewNote(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing?.id ? 'Edit Note' : 'Add Note'} color="var(--cw)">
        {(editing !== null) && <NoteForm note={editing} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} cats={NOTE_CATS} />}
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete this note?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('notes', confirmId); setConfirmId(null) }}>Delete</button>
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
        <div className="field"><label>Title (optional)</label><input value={form.title} onChange={s('title')} placeholder="Note title…" /></div>
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
        <button className="btn btn-primary" style={{ background: '#ff6b6b', color: '#000' }} onClick={() => onSave(form)}>
          {note.id ? 'Save' : 'Add Note'}
        </button>
      </div>
    </>
  )
}
