import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/common/Modal'
import { uid } from '../../constants'
import StickyEditModal from './StickyEditModal'
import { NOTES_COLOR, normalizeSticky, scrollAndFlashEntry, sortJournalPins, STICKY_COLORS } from './stickyShared'

const SIZE_COLS_N = { XS: 4, S: 3, M: 2, L: 1, XL: 1 }
const SIZE_LABELS_N = ['XS', 'S', 'M', 'L']
const NOTE_CATS = ['General', 'Canon', 'Brainstorm', 'Research', 'Todo', 'Quote', 'Other']

function NoteForm({ note, onSave, onCancel, cats }) {
  const [form, setForm] = useState({ title: '', category: 'General', content: '', ...note })
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <>
      <div className="field-row">
        <div className="field"><label>Title (optional)</label><input value={form.title} onChange={s('title')} placeholder="Note title..." /></div>
        <div className="field"><label>Category</label>
          <select value={form.category} onChange={s('category')}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Content *</label>
        <textarea value={form.content} onChange={s('content')} placeholder="Write your note..." style={{ minHeight: 120 }} />
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

export default function JournalView({ db, navSearch, pendingExpandId, clearPendingExpandId }) {
  const notes = db.db.notes || []
  const captures = useMemo(() => (db.db.journal_captures || []).map((c, i) => normalizeSticky(c, i)), [db.db.journal_captures])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [colSize, setColSize] = useState(() => { try { return localStorage.getItem('colsize_notes') || 'M' } catch { return 'M' } })
  const [viewNote, setViewNote] = useState(null)
  const [sidebarEdit, setSidebarEdit] = useState(null)
  const [dragId, setDragId] = useState(null)

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  useEffect(() => {
    if (!pendingExpandId) return
    const entry = notes.find(n => n.id === pendingExpandId)
    if (!entry) return
    setEditing(entry)
    setModalOpen(true)
    window.setTimeout(() => scrollAndFlashEntry(entry.id), 50)
    clearPendingExpandId?.()
  }, [pendingExpandId, notes, clearPendingExpandId])

  const filtered = notes.filter(n => {
    const ms = !search || JSON.stringify(n).toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || n.category === catFilter
    return ms && mc
  }).sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0))

  const usedCats = [...new Set(notes.map(n => n.category).filter(Boolean))]
  const pinnedStickies = sortJournalPins(captures.filter(c => c.pinned_journal))
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 700 : false

  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_notes', sz) } catch {} }

  function handleSave(form) {
    db.upsertEntry('notes', { ...form, id: form.id || uid(), updated: new Date().toISOString() })
    setModalOpen(false)
    setEditing(null)
  }

  function saveSticky(updated) {
    db.upsertEntry('journal_captures', { ...updated, updated_at: new Date().toISOString() })
    setSidebarEdit(null)
  }

  function handleSidebarDrop(targetId) {
    if (!dragId || dragId === targetId) return
    const ordered = sortJournalPins(pinnedStickies)
    const from = ordered.findIndex(s => s.id === dragId)
    const to = ordered.findIndex(s => s.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    next.forEach((sticky, idx) => {
      db.upsertEntry('journal_captures', { ...sticky, journal_sort_order: idx, updated_at: new Date().toISOString() })
    })
    setDragId(null)
  }

  return (
    <div>
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {SIZE_LABELS_N.map(l => (
            <button key={l} onClick={() => changeColSize(l)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: colSize === l ? NOTES_COLOR : 'none', color: colSize === l ? '#000' : 'var(--dim)', border: `1px solid ${colSize === l ? NOTES_COLOR : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em', color: NOTES_COLOR }}>📝 Journal</div>
        <button className="btn btn-primary btn-sm" style={{ background: NOTES_COLOR, color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ New Note</button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tbar" style={{ padding: '0 0 8px' }}>
            <input className="sx" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
            <button className={`fp ${catFilter === 'all' ? 'active' : ''}`} style={{ color: '#ff6b6b' }} onClick={() => setCatFilter('all')}>All</button>
            {usedCats.map(c => (
              <button key={c} className={`fp ${catFilter === c ? 'active' : ''}`} style={{ color: '#ff6b6b' }} onClick={() => setCatFilter(c)}>{c}</button>
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
              <div
                key={n.id}
                id={`gcomp-entry-${n.id}`}
                className="entry-card"
                style={{ '--card-color': 'var(--cw)', background: i % 2 === 1 ? 'rgba(255,255,255,.01)' : undefined, cursor: 'pointer' }}
                onClick={() => setViewNote(n)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {n.title && <div className="entry-title" style={{ fontSize: '1em' }}>{n.title}</div>}
                  {n.category && <span className="badge" style={{ color: '#ff6b6b', borderColor: 'rgba(255,204,0,.3)', flexShrink: 0, marginLeft: 8 }}>{n.category}</span>}
                </div>
                <div style={{ fontSize: '0.92em', color: 'var(--dim)', lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                  {n.content?.length > 300 ? n.content.slice(0, 300) + '...' : n.content}
                </div>
                <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 6 }}>
                  {n.updated ? new Date(n.updated).toLocaleString() : ''}
                </div>
                <div className="entry-actions">
                  <button className="btn btn-sm btn-outline" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }} onClick={e => { e.stopPropagation(); setEditing(n); setModalOpen(true) }}>✎ Edit</button>
                  <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={e => { e.stopPropagation(); setConfirmId(n.id) }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: isMobile ? '100%' : 240, flexShrink: 0 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: '1.1em', color: NOTES_COLOR, marginBottom: 8, textAlign: 'center' }}>📌</div>
            {!pinnedStickies.length && (
              <div style={{ fontSize: '0.8em', color: 'var(--mut)', fontStyle: 'italic' }}>No pinned stickies. Pin from the Stickies sub-tab.</div>
            )}
            {pinnedStickies.map(sticky => {
              const sc = STICKY_COLORS.find(c => c.id === sticky.color) || STICKY_COLORS[0]
              return (
                <div
                  key={sticky.id}
                  draggable
                  onDragStart={() => setDragId(sticky.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleSidebarDrop(sticky.id)}
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--sf)', border: '1px solid var(--brd)', marginBottom: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: sticky.customBg || sc.border, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8em', color: 'var(--tx)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sticky.text}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => setSidebarEdit(sticky)}>✎</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

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

      <StickyEditModal
        open={!!sidebarEdit}
        sticky={sidebarEdit}
        tags={[]}
        onSave={saveSticky}
        onClose={() => setSidebarEdit(null)}
        showJournalUnpin
      />

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete this note?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('notes', confirmId); setConfirmId(null); setViewNote(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
