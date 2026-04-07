import { useState, useEffect } from 'react'
import Modal from '../components/common/Modal'
import { uid, TAB_RAINBOW, RAINBOW, rainbowAt } from '../constants'

const NOTE_CATS = ['General', 'Canon', 'Brainstorm', 'Research', 'Todo', 'Quote', 'Other']
const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const SIZE_COLS = { XS: 1, S: 1, M: 2, L: 3, XL: 4 }
const COLOR = TAB_RAINBOW.notes

export default function Notes({ db, rainbowOn, colDivider }) {
  const notes = db.db.notes || []
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [size, setSize] = useState(() => {
    try { return localStorage.getItem('gcomp_notes_size') || 'M' } catch { return 'M' }
  })

  useEffect(() => {
    const saved = db.settings?.notes_size
    if (saved && SIZES.includes(saved)) setSize(saved)
  }, [db.settings])

  function setAndSaveSize(s) {
    setSize(s)
    try { localStorage.setItem('gcomp_notes_size', s) } catch {}
    db.saveSetting('notes_size', s)
  }

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

  const cols = SIZE_COLS[size] || 2

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: COLOR }}>📝 Notes & Lore</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {SIZES.map(s => (
              <button key={s} onClick={() => setAndSaveSize(s)}
                style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${size === s ? COLOR : 'var(--brd)'}`,
                  background: size === s ? `${COLOR}22` : 'none',
                  color: size === s ? COLOR : 'var(--mut)' }}>
                {s}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" style={{ background: COLOR, color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ New Note</button>
        </div>
      </div>

      <div className="tbar" style={{ padding: '0 0 8px' }}>
        <input className="sx" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
        <button className={`fp ${catFilter==='all'?'active':''}`} style={{ color: COLOR }} onClick={() => setCatFilter('all')}>All</button>
        {usedCats.map(c => (
          <button key={c} className={`fp ${catFilter===c?'active':''}`} style={{ color: COLOR }} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">📝</div>
          <p>No notes yet.</p>
          <button className="btn btn-primary" style={{ background: COLOR, color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Note</button>
        </div>
      )}

      <div className={`cg${colDivider ? ' with-dividers' : ''}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {filtered.map((n, i) => {
          const cardCol = rainbowOn ? rainbowAt(i) : COLOR
          const isExpanded = expandedId === n.id
          return (
            <div key={n.id} className="entry-card"
              style={{ '--card-color': cardCol, cursor: 'pointer' }}
              onClick={() => setExpandedId(isExpanded ? null : n.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {n.title && <div className="entry-title" style={{ fontSize: 13 }}>{n.title}</div>}
                {n.category && <span className="badge" style={{ color: cardCol, borderColor: `${cardCol}44`, flexShrink: 0, marginLeft: 8 }}>{n.category}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                {isExpanded
                  ? n.content
                  : (n.content?.length > 200 ? n.content.slice(0, 200) + '…' : n.content)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 6 }}>
                {n.updated ? new Date(n.updated).toLocaleDateString() : ''}
                {!isExpanded && n.content?.length > 200 && <span style={{ color: cardCol, marginLeft: 6 }}>▼ expand</span>}
                {isExpanded && <span style={{ color: cardCol, marginLeft: 6 }}>▲ collapse</span>}
              </div>
              <div className="entry-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-sm btn-outline" style={{ color: cardCol, borderColor: cardCol }}
                  onClick={() => { setEditing(n); setModalOpen(true) }}>✎ Edit</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
                  onClick={() => setConfirmId(n.id)}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing?.id ? 'Edit Note' : 'Add Note'} color={COLOR}>
        {editing !== null && <NoteForm note={editing} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} cats={NOTE_CATS} />}
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
        <div className="field"><label>Title (optional)</label><input value={form.title} onChange={s('title')} placeholder="Note title…" /></div>
        <div className="field"><label>Category</label>
          <select value={form.category} onChange={s('category')}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Content *</label>
        <textarea value={form.content} onChange={s('content')} placeholder="Write your note…" style={{ minHeight: 140 }} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: TAB_RAINBOW.notes, color: '#000' }}
          onClick={() => onSave(form)}>
          {note.id ? 'Save' : 'Add Note'}
        </button>
      </div>
    </>
  )
}
