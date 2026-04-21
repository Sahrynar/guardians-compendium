import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { uid } from '../constants'
import { parseSetting } from '../hooks/useDB'

const BOOKS = ['Book 1', 'Book 2', 'Book 3']
const MS_COLOR = '#aacc00'
const MS_SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL']
// XS = compact list, XL = full card with text preview
const MS_SIZE_DETAIL = { XS: 0, S: 0, M: 60, L: 150, XL: 300 }
const STATUSES = ['Draft', 'Revision', 'Polishing', 'Done']
const STATUS_COLORS = { Draft: '#6b7280', Revision: '#f59e0b', Polishing: '#8b5cf6', Done: '#10b981' }

// ── Light formatting helpers ──────────────────────────────────────
function toHTML(text) {
  if (!text) return ''
  // Normalize line endings
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Scene break *** on its own line
  t = t.replace(/^[ \t]*\*{3}[ \t]*$/gm, '\n<p style="text-align:center;letter-spacing:.3em">* * *</p>\n')
  // HR ---
  t = t.replace(/^[ \t]*---[ \t]*$/gm, '<hr>')
  // Inline formatting
  t = t.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>')
  t = t.replace(/_(.*?)_/g, '<em>$1</em>')
  // Split into paragraphs on blank lines (1 or more)
  const paras = t.split(/\n{2,}/)
  return paras.map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ''
    // Already an HTML block (scene break, hr)
    if (trimmed.startsWith('<')) return trimmed
    // Single newlines within a paragraph become line breaks
    return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>'
  }).filter(Boolean).join('\n')
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
export default function Manuscript({ db, navSearch }) {
  const tabColor = MS_COLOR
  const chapters = (db.db.manuscript || []).sort((a, b) => {
    const bi = BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseInt(a.chapter_num) || 0) - (parseInt(b.chapter_num) || 0)
  })
  const chars = db.db.characters || []
  const scenes = db.db.scenes || []

  const [search, setSearch] = useState('')

  // Sync top nav search
  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  const [filterBook, setFilterBook] = useState('all')
  const [tocBook, setTocBook] = useState(null) // null = shelf, 'Book 1' etc = TOC view
  const [coverLightbox, setCoverLightbox] = useState(null) // cover image for lightbox
  const [editCovers, setEditCovers] = useState(false)
  const [colSize, setColSize] = useState(() => { try { return localStorage.getItem('colsize_manuscript') || 'M' } catch { return 'M' } })
  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_manuscript', sz) } catch {} }
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingChapter, setEditingChapter] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [addingChapter, setAddingChapter] = useState(false)
  const [newForm, setNewForm] = useState({ book: 'Book 1', chapter_num: '', title: '' })

  // Escape key: close lightbox — must be after all useState declarations
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && coverLightbox) setCoverLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [coverLightbox])

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
      {!tocBook && (
        <>
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
              const meta = parseSetting(db.settings?.[`manuscript_book_${book.replace(/ /g,'_')}`])
              const cover = meta.cover || ''
              const accent = meta.accent || '#aacc00'
              return (
                <div key={book} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 200 }}>
                  <div style={{
                    width: 200, height: 300, borderRadius: '4px 10px 10px 4px', overflow: 'hidden',
                    border: `3px solid ${accent}`, background: cover ? 'transparent' : accent + '22',
                    boxShadow: '4px 6px 18px rgba(0,0,0,.55)', cursor: 'pointer',
                  }} onClick={() => {
                        const meta2 = parseSetting(db.settings?.[`manuscript_book_${book.replace(/ /g,'_')}`])
                        const cover2 = meta2?.cover || ''
                        if (cover2) {
                          setCoverLightbox({ book, cover: cover2 })  // lightbox → then TOC on close
                        } else {
                          setTocBook(book)
                          setFilterBook(book)
                        }
                      }}>
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
                              const existing = parseSetting(db.settings?.[key])
                              db.saveSetting(key, JSON.stringify({ ...existing, cover: e2.target.result }))
                            }
                            reader.readAsDataURL(file)
                          }} />
                      </label>
                      <input type="color" value={accent} title="Accent colour"
                        style={{ width: 22, height: 22, padding: 0, border: 'none', borderRadius: 3, cursor: 'pointer' }}
                        onChange={ev => {
                          const key = `manuscript_book_${book.replace(/ /g,'_')}`
                          const existing = parseSetting(db.settings?.[key])
                          db.saveSetting(key, JSON.stringify({ ...existing, accent: ev.target.value }))
                        }} />
                      {cover && (
                        <button title="Remove cover" style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', padding: 0 }}
                          onClick={() => {
                            const key = `manuscript_book_${book.replace(/ /g,'_')}`
                            const existing = parseSetting(db.settings?.[key])
                            db.saveSetting(key, JSON.stringify({ ...existing, cover: '' }))
                          }}>✕</button>
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: editCovers ? 4 : 8, textAlign: 'center', width: '100%' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: accent, fontWeight: 700 }}>{book}</div>
                    <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 2 }}>{chs.length} chapters · {words.toLocaleString()} words</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {STATUSES.map(s => { const n = chs.filter(ch2 => ch2.status === s).length; if (!n) return null
                        return <span key={s} style={{ fontSize: '0.62em', padding: '1px 5px', borderRadius: 3,
                          background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{n} {s}</span>
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
        </>
      )}

      {/* Toolbar */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {MS_SIZE_LABELS.map(l => (
            <button key={l} onClick={() => changeColSize(l)} style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: colSize===l ? MS_COLOR : 'none', color: colSize===l ? '#000' : 'var(--dim)', border: `1px solid ${colSize===l ? MS_COLOR : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
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

      {/* ── TOC view (single book) ── */}
      {tocBook && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--brd)' }}>
            <button onClick={() => { setTocBook(null); setFilterBook('all'); setCoverLightbox(null) }}
              style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 6,
                background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>
              ← Back to Shelf
            </button>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: MS_COLOR, fontWeight: 700 }}>{tocBook}</div>
            <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginLeft: 'auto' }}>
              {chapters.filter(c => c.book === tocBook).length} chapters · {chapters.filter(c => c.book === tocBook).reduce((s, c) => s + (c.word_count || wordCount(c.text || '')), 0).toLocaleString()} words
            </div>
          </div>
        </div>
      )}

      {tocBook && (
        <>
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

          {BOOKS.filter(b => b === tocBook).map(book => {
            const bookChapters = filtered.filter(ch => ch.book === book)
            if (!bookChapters.length) return null
            return (
              <div key={book} style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gap: 2 }}>
                  {bookChapters.map(ch => {
                    const wc = ch.word_count || wordCount(ch.text || '')
                    const sc = STATUS_COLORS[ch.status] || '#6b7280'
                    return (
                      <div key={ch.id}
                        style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10, alignItems: 'baseline',
                          padding: '8px 10px', borderRadius: 4, cursor: 'pointer', transition: 'background .12s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--card)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        onClick={() => setEditingChapter(ch)}>
                        <div style={{ fontSize: '0.75em', color: tabColor, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                          Chapter {ch.chapter_num}
                        </div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.02em', color: 'var(--tx)' }}>
                          {ch.title || <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>Untitled</span>}
                        </div>
                        <div style={{ fontSize: '0.75em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                          {wc.toLocaleString()} words · <span style={{ color: sc }}>{ch.status || 'Draft'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── Cover lightbox overlay ── */}
      {coverLightbox && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }} onClick={() => {
          // Click outside image = back to shelf
          setCoverLightbox(null)
        }}>
          <div style={{ position: 'relative', maxWidth: '40vw', maxHeight: '80vh' }}>
            <img src={coverLightbox.cover} alt={coverLightbox.book}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain',
                borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.8)',
                border: '2px solid rgba(255,255,255,.15)', cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation()
                const book = coverLightbox.book
                setCoverLightbox(null)
                setTocBook(book)
                setFilterBook(book)
              }} />
            <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0,
              textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: '0.85em' }}>
              Click image to open book · Click outside or ✕ to close
            </div>
            <button onClick={e => { e.stopPropagation(); setCoverLightbox(null) }}
              style={{ position: 'absolute', top: -12, right: -12, width: 28, height: 28,
                borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.2)',
                color: 'rgba(255,255,255,.7)', fontSize: '1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      )}

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
