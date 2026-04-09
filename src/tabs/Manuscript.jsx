import { useState, useMemo, useRef, useCallback } from 'react'
import { uid } from '../constants'

const BOOKS = ['Book 1', 'Book 2', 'Book 3']
const STATUSES = ['Draft', 'Revision', 'Polishing', 'Done']
const STATUS_COLORS = { Draft: '#6b7280', Revision: '#f59e0b', Polishing: '#8b5cf6', Done: '#10b981' }

// ── Light formatting helpers ──────────────────────────────────────
function toHTML(text) {
  // Convert markdown-lite formatting to HTML
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\*\*\*$/gm, '<p style="text-align:center">* * *</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
}

function toSubstack(text) {
  // Clean HTML for Substack clipboard
  return '<div>' + toHTML(text) + '</div>'
}

function stripFormatting(text) {
  return text.replace(/\*+/g, '').replace(/_/g, '')
}

// ── Word count ────────────────────────────────────────────────────
function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length
}

// ── Formatting toolbar ────────────────────────────────────────────
function FormatBar({ textareaRef, onUpdate }) {
  function wrap(before, after) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.slice(start, end)
    const newVal = ta.value.slice(0, start) + before + sel + (after || before) + ta.value.slice(end)
    onUpdate(newVal)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }
  function insert(text) {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const newVal = ta.value.slice(0, pos) + text + ta.value.slice(pos)
    onUpdate(newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + text.length, pos + text.length) }, 0)
  }

  const btn = (label, title, action) => (
    <button key={label} onClick={action} title={title}
      style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 5, background: 'var(--card)',
        border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer', fontStyle: label === 'I' ? 'italic' : 'normal',
        fontWeight: label === 'B' || label === 'BI' ? 700 : 400 }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--brd)', marginBottom: 8 }}>
      {btn('I', 'Italic (*text*)', () => wrap('*', '*'))}
      {btn('B', 'Bold (**text**)', () => wrap('**', '**'))}
      {btn('BI', 'Bold Italic (***text***)', () => wrap('***', '***'))}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('— em dash', 'Insert em dash', () => insert('—'))}
      {btn('… ellipsis', 'Insert ellipsis', () => insert('…'))}
      {btn('* * * break', 'Scene break', () => insert('\n\n***\n\n'))}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('" "', 'Curly double quotes', () => wrap('\u201c', '\u201d'))}
      {btn("' '", 'Curly single quotes', () => wrap('\u2018', '\u2019'))}
    </div>
  )
}

// ── Chapter editor ────────────────────────────────────────────────
function ChapterEditor({ chapter, chars, scenes, onSave, onClose }) {
  const [text, setText] = useState(chapter.text || '')
  const [title, setTitle] = useState(chapter.title || '')
  const [status, setStatus] = useState(chapter.status || 'Draft')
  const [notes, setNotes] = useState(chapter.notes || '')
  const [view, setView] = useState('edit') // 'edit' | 'preview' | 'split'
  const [annotations, setAnnotations] = useState(chapter.annotations || [])
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)
  const wc = wordCount(text)

  // Detect which characters appear in this chapter
  const detectedChars = useMemo(() => {
    if (!text) return []
    return chars.filter(c => {
      const name = c.display_name || c.name || ''
      const aliases = (c.aliases || '').split(',').map(a => a.trim()).filter(Boolean)
      return [name, ...aliases].some(n => n && text.includes(n))
    })
  }, [text, chars])

  function copyForSubstack() {
    const html = toSubstack(text)
    if (navigator.clipboard?.write) {
      const blob = new Blob([html], { type: 'text/html' })
      const plain = new Blob([stripFormatting(text)], { type: 'text/plain' })
      navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': plain })])
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
        .catch(() => {
          // Fallback: copy plain text
          navigator.clipboard.writeText(stripFormatting(text))
          setCopied(true); setTimeout(() => setCopied(false), 2000)
        })
    } else {
      navigator.clipboard?.writeText(stripFormatting(text))
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  function save() {
    onSave({ ...chapter, title, text, status, notes, annotations, word_count: wc })
  }

  const statusCol = STATUS_COLORS[status] || '#6b7280'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
        borderBottom: '1px solid var(--brd)', background: 'var(--sf)', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: '#aacc00', flex: 1 }}>
          {chapter.book} · Ch. {chapter.chapter_num}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chapter title…"
          style={{ flex: 2, minWidth: 200, fontSize: '1em', padding: '4px 8px', background: 'var(--card)',
            border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontFamily: "'Cinzel',serif" }} />
        {/* Status */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ fontSize: '0.85em', padding: '4px 8px', background: `${statusCol}22`, border: `1px solid ${statusCol}`,
            borderRadius: 6, color: statusCol, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[['edit','✎'],['preview','👁'],['split','⧉']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ fontSize: '0.85em', padding: '3px 8px', borderRadius: 6,
                background: view === v ? 'var(--csc)' : 'none',
                color: view === v ? '#000' : 'var(--dim)',
                border: `1px solid ${view === v ? 'var(--csc)' : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {/* Word count */}
        <span style={{ fontSize: '0.77em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
          {wc.toLocaleString()} words · ~{Math.round(wc / 250)} min read
        </span>
        {/* Copy for Substack */}
        <button onClick={copyForSubstack}
          style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 6, background: '#aacc00',
            color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied!' : '📋 Copy for Substack'}
        </button>
        <button onClick={() => setShowAnnotations(a => !a)}
          style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 6,
            background: showAnnotations ? 'var(--cca)' : 'none',
            color: showAnnotations ? '#000' : 'var(--dim)',
            border: '1px solid var(--brd)', cursor: 'pointer' }}>
          📝 Notes ({annotations.length})
        </button>
        <button onClick={save}
          style={{ fontSize: '0.85em', padding: '5px 14px', borderRadius: 6, background: '#aacc00',
            color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Save</button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '1.38em' }}>✕</button>
      </div>

      {/* Detected characters */}
      {detectedChars.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px', background: 'var(--card)',
          borderBottom: '1px solid var(--brd)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.69em', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Characters:</span>
          {detectedChars.map(c => (
            <span key={c.id} style={{ fontSize: '0.77em', padding: '1px 8px', borderRadius: 10,
              background: 'rgba(51,136,255,.15)', color: 'var(--cc)', border: '1px solid rgba(51,136,255,.3)' }}>
              {c.display_name || c.name}
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor */}
        {(view === 'edit' || view === 'split') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px', overflow: 'hidden',
            borderRight: view === 'split' ? '1px solid var(--brd)' : 'none' }}>
            <FormatBar textareaRef={textareaRef} onUpdate={setText} />
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
              style={{ flex: 1, resize: 'none', fontSize: '1em', lineHeight: 1.8, padding: '8px 0',
                background: 'transparent', border: 'none', color: 'var(--tx)', outline: 'none',
                fontFamily: 'Georgia, serif', overflowY: 'auto' }}
              placeholder="Paste or type your chapter here. Use *italic*, **bold**, — for em dash, *** for scene break." />
          </div>
        )}

        {/* Preview */}
        {(view === 'preview' || view === 'split') && (
          <div style={{ flex: 1, padding: '10px 40px', overflowY: 'auto',
            fontFamily: 'Georgia, serif', fontSize: '1.08em', lineHeight: 1.9, color: 'var(--tx)' }}
            dangerouslySetInnerHTML={{ __html: toHTML(text) || '<p style="color:var(--mut)">Nothing to preview yet.</p>' }} />
        )}

        {/* Annotations panel */}
        {showAnnotations && (
          <div style={{ width: 280, borderLeft: '1px solid var(--brd)', padding: '10px 14px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: 'var(--cca)', marginBottom: 10 }}>📝 Chapter Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
              placeholder="Chapter-level notes, to-do, revision thoughts…"
              style={{ width: '100%', fontSize: '0.85em', padding: '6px 8px', background: 'var(--card)',
                border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: '0.77em', fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Passage Flags
            </div>
            {annotations.length === 0 && (
              <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>No passage flags yet. Select text and add a flag.</div>
            )}
            {annotations.map((ann, i) => (
              <div key={ann.id} style={{ marginBottom: 8, padding: '6px 8px', background: 'var(--card)',
                borderLeft: '3px solid var(--cfl)', borderRadius: '0 6px 6px 0', fontSize: '0.77em' }}>
                <div style={{ color: 'var(--cfl)', fontStyle: 'italic', marginBottom: 3 }}>"{ann.passage}"</div>
                <div style={{ color: 'var(--tx)' }}>{ann.note}</div>
                <button onClick={() => setAnnotations(a => a.filter(x => x.id !== ann.id))}
                  style={{ fontSize: '0.69em', color: '#ff3355', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formatting guide */}
      <div style={{ padding: '4px 14px', background: 'var(--card)', borderTop: '1px solid var(--brd)',
        fontSize: '0.69em', color: 'var(--mut)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[['*text*','italic'],['**text**','bold'],['***text***','bold italic'],['—','em dash'],['…','ellipsis'],['***','scene break']].map(([code, label]) => (
          <span key={code}><code style={{ color: 'var(--cca)' }}>{code}</code> = {label}</span>
        ))}
      </div>
    </div>
  )
}

// ── Main Manuscript tab ───────────────────────────────────────────
export default function Manuscript({ db }) {
  const chapters = (db.db.manuscript || []).sort((a, b) => {
    const bi = BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseInt(a.chapter_num) || 0) - (parseInt(b.chapter_num) || 0)
  })
  const chars = db.db.characters || []
  const scenes = db.db.scenes || []

  const [search, setSearch] = useState('')
  const [filterBook, setFilterBook] = useState('all')
  const [editCovers, setEditCovers] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingChapter, setEditingChapter] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [addingChapter, setAddingChapter] = useState(false)
  const [newForm, setNewForm] = useState({ book: 'Book 1', chapter_num: '', title: '' })

  const filtered = chapters.filter(ch => {
    const mb = filterBook === 'all' || ch.book === filterBook
    const ms = filterStatus === 'all' || ch.status === filterStatus
    const mq = !search || (ch.title||'').toLowerCase().includes(search.toLowerCase()) ||
      (ch.text||'').toLowerCase().includes(search.toLowerCase())
    return mb && ms && mq
  })

  // Stats
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || wordCount(ch.text || '')), 0)
  const byBook = BOOKS.map(b => ({
    book: b,
    chapters: chapters.filter(ch => ch.book === b),
    words: chapters.filter(ch => ch.book === b).reduce((s, ch) => s + (ch.word_count || wordCount(ch.text||'')), 0)
  }))

  function saveChapter(ch) {
    db.upsertEntry('manuscript', ch)
    setEditingChapter(null)
  }

  function addChapter() {
    if (!newForm.chapter_num) return
    const ch = {
      id: uid(),
      book: newForm.book,
      chapter_num: newForm.chapter_num,
      title: newForm.title,
      text: '',
      status: 'Draft',
      notes: '',
      annotations: [],
      word_count: 0,
    }
    db.upsertEntry('manuscript', ch)
    setAddingChapter(false)
    setNewForm({ book: 'Book 1', chapter_num: '', title: '' })
    setEditingChapter(ch)
  }

  return (
    <div>
      {/* Book shelf — portrait cards, image only on cover face */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <button onClick={() => setEditCovers(e => !e)}
          style={{ fontSize: '0.77em', padding: '3px 12px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${editCovers ? '#aacc00' : 'var(--brd)'}`,
            background: editCovers ? '#aacc0022' : 'none',
            color: editCovers ? '#aacc00' : 'var(--dim)' }}>
          {editCovers ? '✓ Done' : '✎ Edit covers'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
        {byBook.map(({ book, chapters: chs, words }) => {
          const meta = db.settings?.[`manuscript_book_${book.replace(/ /g,'_')}`] || {}
          const cover = meta.cover || ''
          const accent = meta.accent || '#aacc00'
          return (
            <div key={book} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150 }}>
              <div style={{
                width: 150, height: 220, borderRadius: '4px 8px 8px 4px', overflow: 'hidden',
                border: `3px solid ${accent}`, background: cover ? 'transparent' : accent + '22',
                boxShadow: '4px 6px 18px rgba(0,0,0,.55)', cursor: 'pointer',
              }} onClick={() => setFilterBook(filterBook === book ? 'all' : book)}>
                {cover
                  ? <img src={cover} alt={book} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '2.46em', opacity: 0.25 }}>📖</span>
                    </div>
                }
              </div>
              {/* Edit controls — shown in edit mode */}
              {editCovers && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <label title="Upload cover image" style={{ cursor: 'pointer', fontSize: '1.08em', color: '#aacc00' }}>
                    🖼
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={ev => {
                        const file = ev.target.files?.[0]; if (!file) return
                        const reader = new FileReader()
                        reader.onload = e2 => {
                          const key = `manuscript_book_${book.replace(/ /g,'_')}`
                          const existing = db.settings?.[key] ? JSON.parse(db.settings[key]) : {}
                          db.saveSetting(key, JSON.stringify({ ...existing, cover: e2.target.result }))
                        }
                        reader.readAsDataURL(file)
                      }} />
                  </label>
                  <input type="color" value={accent} title="Accent colour"
                    style={{ width: 22, height: 22, padding: 0, border: 'none', borderRadius: 3, cursor: 'pointer' }}
                    onChange={ev => {
                      const key = `manuscript_book_${book.replace(/ /g,'_')}`
                      const existing = db.settings?.[key] ? JSON.parse(db.settings[key]) : {}
                      db.saveSetting(key, JSON.stringify({ ...existing, accent: ev.target.value }))
                    }} />
                  {cover && (
                    <button title="Remove cover" style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', padding: 0 }}
                      onClick={() => {
                        const key = `manuscript_book_${book.replace(/ /g,'_')}`
                        const existing = db.settings?.[key] ? JSON.parse(db.settings[key]) : {}
                        db.saveSetting(key, JSON.stringify({ ...existing, cover: '' }))
                      }}>✕</button>
                  )}
                </div>
              )}
              <div style={{ marginTop: editCovers ? 4 : 8, textAlign: 'center', width: '100%' }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.85em', color: accent, fontWeight: 700 }}>{book}</div>
                <div style={{ fontSize: '0.77em', color: 'var(--dim)' }}>{chs.length} ch · {words.toLocaleString()} w</div>
                <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {STATUSES.map(s => { const n = chs.filter(c => c.status === s).length; if (!n) return null
                    return <span key={s} style={{ fontSize: '0.62em', padding: '1px 4px', borderRadius: 3,
                      background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{s} {n}</span>
                  })}
                </div>
              </div>
            </div>
          )
        })}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.77em', color: 'var(--dim)', marginBottom: 2 }}>Total</div>
          <div style={{ fontSize: '1.69em', fontWeight: 700, color: 'var(--tx)' }}>{totalWords.toLocaleString()}</div>
          <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>words · {chapters.length} ch</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <input className="sx" placeholder="Search chapters and text…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={filterBook} onChange={e => setFilterBook(e.target.value)}
          style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All books</option>
          {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: '#aacc00' }}
          onClick={() => setAddingChapter(true)}>+ Add Chapter</button>
      </div>

      {/* Add chapter form */}
      {addingChapter && (
        <div style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--csc)',
          borderRadius: 8, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Book</label>
            <select value={newForm.book} onChange={e => setNewForm(p => ({ ...p, book: e.target.value }))}>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Chapter #</label>
            <input type="number" value={newForm.chapter_num} onChange={e => setNewForm(p => ({ ...p, chapter_num: e.target.value }))}
              style={{ width: 80 }} placeholder="e.g. 1" />
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label>Title (optional)</label>
            <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Barn power manifestation" />
          </div>
          <button className="btn btn-primary btn-sm" style={{ background: '#aacc00' }} onClick={addChapter}>Add</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAddingChapter(false)}>Cancel</button>
        </div>
      )}

      {/* Chapter list */}
      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <p>{chapters.length === 0 ? 'No chapters yet.' : 'No chapters match your filters.'}</p>
          {chapters.length === 0 && (
            <button className="btn btn-primary" style={{ background: '#aacc00' }} onClick={() => setAddingChapter(true)}>
              + Add First Chapter
            </button>
          )}
        </div>
      )}

      {BOOKS.filter(b => filterBook === 'all' || b === filterBook).map(book => {
        const bookChapters = filtered.filter(ch => ch.book === book)
        if (!bookChapters.length) return null
        return (
          <div key={book} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: '#aacc00',
              marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--brd)' }}>{book}</div>
            {bookChapters.map(ch => {
              const sc = STATUS_COLORS[ch.status] || '#6b7280'
              const wc = ch.word_count || wordCount(ch.text || '')
              const detectedCharsInCh = chars.filter(c => {
                const name = c.display_name || c.name || ''
                return name && (ch.text || '').includes(name)
              })
              return (
                <div key={ch.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8,
                    marginBottom: 4, cursor: 'pointer', transition: '.12s',
                    borderLeft: `3px solid ${sc}` }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = sc}
                  onMouseLeave={e => e.currentTarget.style.borderLeft = `3px solid ${sc}`}
                  onClick={() => setEditingChapter(ch)}>
                  <div style={{ fontSize: '0.85em', color: 'var(--mut)', minWidth: 28 }}>Ch.{ch.chapter_num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92em', fontWeight: 600, color: 'var(--tx)' }}>
                      {ch.title || <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>Untitled</span>}
                    </div>
                    {detectedCharsInCh.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                        {detectedCharsInCh.slice(0, 8).map(c => (
                          <span key={c.id} style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 8,
                            background: 'rgba(51,136,255,.12)', color: 'var(--cc)' }}>
                            {c.display_name || c.name}
                          </span>
                        ))}
                        {detectedCharsInCh.length > 8 && (
                          <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>+{detectedCharsInCh.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.69em', padding: '2px 8px', borderRadius: 10,
                    background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, whiteSpace: 'nowrap' }}>
                    {ch.status || 'Draft'}
                  </span>
                  <span style={{ fontSize: '0.77em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                    {wc > 0 ? wc.toLocaleString() + ' w' : 'empty'}
                  </span>
                  {ch.notes && <span style={{ fontSize: '0.85em' }} title="Has notes">📝</span>}
                  {(ch.annotations || []).length > 0 && (
                    <span style={{ fontSize: '0.69em', color: 'var(--cfl)' }}>🚩{ch.annotations.length}</span>
                  )}
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(ch.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer',
                      fontSize: '1.08em', padding: '0 4px', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Chapter editor */}
      {editingChapter && (
        <ChapterEditor
          chapter={editingChapter}
          chars={chars}
          scenes={scenes}
          onSave={saveChapter}
          onClose={() => setEditingChapter(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete this chapter? <strong>This cannot be undone.</strong></p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => {
              db.deleteEntry('manuscript', confirmDelete)
              setConfirmDelete(null)
            }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
