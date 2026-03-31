import { useState } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

const NOTE_CATS = ['General', 'Canon', 'Brainstorm', 'Research', 'Todo', 'Quote', 'Other']

export default function Notes({ db }) {
  const notes = db.db.notes || []
  const [search, setSearch] = useState('')
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('nt_cols') || '2'))
  function saveColCount(n) { setColCount(n); db.saveSetting?.('nt_cols', String(n)) }
  const [dividers, setDividers] = useState(() => db.getSetting?.('nt_cols_div') !== 'off')
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('nt_cols_div', next ? 'on' : 'off') }
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const filtered = notes.filter(n => {
    const ms = !search || JSON.stringify(n).toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || n.category === catFilter
    return ms && mc
  }).sort((a, b) => new Date(b.updated||0) - new Date(a.updated||0))

  const usedCats = [...new Set(notes.map(n => n.category).filter(Boolean))]

  function handleSave(form) {
    if (!form.id) {
      const newTitle = (form.title || '').toLowerCase().trim()
      if (newTitle) {
        const dupe = notes.find(n => (n.title || '').toLowerCase().trim() === newTitle)
        if (dupe && !window.confirm(`A note titled "${dupe.title}" already exists. Save anyway?`)) return
      }
    }
    const stamped = { ...form, id: form.id || uid(), updated_at: new Date().toISOString() }
    if (!form.id) stamped.created = stamped.created || stamped.updated_at
    db.upsertEntry('notes', stamped)
    setModalOpen(false); setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cw)' }}>📝 Notes & Lore</div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cw)', color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ New Note</button>
      </div>

      <div className="tbar" style={{ padding: '0 0 8px' }}>
        <div style={{ display:'flex', gap:3 }}>
          {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
            <button key={l} onClick={() => saveColCount(n)}
              style={{ fontSize:9, padding:'2px 7px', borderRadius:8,
                background: colCount===n ? 'var(--cw)' : 'none',
                color: colCount===n ? '#000' : 'var(--dim)',
                border: `1px solid ${colCount===n ? 'var(--cw)' : 'var(--brd)'}`,
                cursor:'pointer' }}>{l}</button>
          ))}
        
        <button onClick={toggleDividers}
          style={{ fontSize:9, padding:'2px 7px', borderRadius:8, marginLeft:8,
            background: dividers ? 'rgba(255,255,255,.08)' : 'none',
            color: dividers ? 'var(--tx)' : 'var(--mut)',
            border:'1px solid var(--brd)', cursor:'pointer' }}>
          {dividers ? '┃ on' : '┃ off'}
        </button>
        </div>
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
          <p style={{ fontSize: 11, color: 'var(--mut)', maxWidth: 300, margin: '8px auto' }}>For quick notes, brainstorms, canon reminders, research snippets, and anything that doesn't fit elsewhere.</p>
          <button className="btn btn-primary" style={{ background: 'var(--cw)', color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Note</button>
        </div>
      )}

      <div  style={{ columns: colCount, columnGap: 10, columnRule: dividers ? '1px solid var(--brd)' : 'none' }}>
        {filtered.map((n, i) => (
          <div key={n.id} className="entry-card" style={{ breakInside: 'avoid', marginBottom: 6, '--card-color': 'var(--cw)', background: i%2===1?'rgba(255,255,255,.01)':undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {n.title && <div className="entry-title" style={{ fontSize: 13 }}>{n.title}</div>}
              {n.category && <span className="badge" style={{ color: 'var(--cw)', borderColor: 'rgba(255,204,0,.3)', flexShrink: 0, marginLeft: 8 }}>{n.category}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
              {n.content?.length > 300 ? n.content.slice(0, 300) + '…' : n.content}
            </div>
            <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 6 }}>
              {n.updated ? new Date(n.updated).toLocaleDateString() : ''}
            </div>
            <div className="entry-actions">
              <button className="btn btn-sm btn-outline" style={{ color: 'var(--cw)', borderColor: 'var(--cw)' }} onClick={() => { setEditing(n); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(n.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

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
        <button className="btn btn-primary" style={{ background: 'var(--cw)', color: '#000' }} onClick={() => onSave(form)}>
          {note.id ? 'Save' : 'Add Note'}
        </button>
      </div>
    </>
  )
}
