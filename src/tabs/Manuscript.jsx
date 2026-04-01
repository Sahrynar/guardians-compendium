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
      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'var(--card)',
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
          navigator.clipboard.writeText(stripFormatting(text))
          setCopied(true); setTimeout(() => setCopied(false), 2000)
        })
    } else {
      navigator.clipboard?.writeText(stripFormatting(text))
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  function exportMd() {
    const header = [
      `# ${title || 'Untitled'}`,
      notes ? `\n> **Notes:** ${notes}` : '',
      `\n---\n`,
    ].filter(Boolean).join('\n')
    const body = header + (text || '')
    const blob = new Blob([body], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(title || 'chapter').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
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
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: 'var(--csc)', flex: 1 }}>
          {chapter.book} · Ch. {chapter.chapter_num}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chapter title…"
          style={{ flex: 2, minWidth: 200, fontSize: 13, padding: '4px 8px', background: 'var(--card)',
            border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontFamily: "'Cinzel',serif" }} />
        {/* Status */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ fontSize: 11, padding: '4px 8px', background: `${statusCol}22`, border: `1px solid ${statusCol}`,
            borderRadius: 6, color: statusCol, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[['edit','✎'],['preview','👁'],['split','⧉']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: view === v ? 'var(--csc)' : 'none',
                color: view === v ? '#000' : 'var(--dim)',
                border: `1px solid ${view === v ? 'var(--csc)' : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {/* Word count */}
        <span style={{ fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
          {wc.toLocaleString()} words · ~{Math.round(wc / 250)} min read
        </span>
        {/* Copy for Substack */}
        <button onClick={copyForSubstack}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: '#ff6719',
            color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied!' : '📋 Copy for Substack'}
        </button>
        {/* Export .md */}
        <button onClick={exportMd}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: 'none',
            color: 'var(--dim)', border: '1px solid var(--brd)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ⬇ .md
        </button>
        <button onClick={() => setShowAnnotations(a => !a)}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6,
            background: showAnnotations ? 'var(--cca)' : 'none',
            color: showAnnotations ? '#000' : 'var(--dim)',
            border: '1px solid var(--brd)', cursor: 'pointer' }}>
          📝 Notes ({annotations.length})
        </button>
        <button onClick={save}
          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: 'var(--csc)',
            color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Save</button>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>

      {/* Detected characters */}
      {detectedChars.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px', background: 'var(--card)',
          borderBottom: '1px solid var(--brd)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Characters:</span>
          {detectedChars.map(c => (
            <span key={c.id} style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10,
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
              style={{ flex: 1, resize: 'none', fontSize: 13, lineHeight: 1.8, padding: '8px 0',
                background: 'transparent', border: 'none', color: 'var(--tx)', outline: 'none',
                fontFamily: 'Georgia, serif', overflowY: 'auto' }}
              placeholder="Paste or type your chapter here. Use *italic*, **bold**, — for em dash, *** for scene break." />
          </div>
        )}

        {/* Preview */}
        {(view === 'preview' || view === 'split') && (
          <div style={{ flex: 1, padding: '10px 40px', overflowY: 'auto',
            fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.9, color: 'var(--tx)' }}
            dangerouslySetInnerHTML={{ __html: toHTML(text) || '<p style="color:var(--mut)">Nothing to preview yet.</p>' }} />
        )}

        {/* Annotations panel */}
        {showAnnotations && (
          <div style={{ width: 280, borderLeft: '1px solid var(--brd)', padding: '10px 14px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: 'var(--cca)', marginBottom: 10 }}>📝 Chapter Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
              placeholder="Chapter-level notes, to-do, revision thoughts…"
              style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--card)',
                border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Passage Flags
            </div>
            {annotations.length === 0 && (
              <div style={{ fontSize: 10, color: 'var(--mut)' }}>No passage flags yet. Select text and add a flag.</div>
            )}
            {annotations.map((ann, i) => (
              <div key={ann.id} style={{ marginBottom: 8, padding: '6px 8px', background: 'var(--card)',
                borderLeft: '3px solid var(--cfl)', borderRadius: '0 6px 6px 0', fontSize: 10 }}>
                <div style={{ color: 'var(--cfl)', fontStyle: 'italic', marginBottom: 3 }}>"{ann.passage}"</div>
                <div style={{ color: 'var(--tx)' }}>{ann.note}</div>
                <button onClick={() => setAnnotations(a => a.filter(x => x.id !== ann.id))}
                  style={{ fontSize: 9, color: '#ff3355', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formatting guide */}
      <div style={{ padding: '4px 14px', background: 'var(--card)', borderTop: '1px solid var(--brd)',
        fontSize: 9, color: 'var(--mut)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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

  const [view, setView] = useState('shelf') // 'shelf' | 'toc'
  const [shelfBook, setShelfBook] = useState(null) // which book is open on shelf
  const [search, setSearch] = useState('')
  const [filterBook, setFilterBook] = useState('all')
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

  // Shelf view - books as large clickable cards
  function ShelfView() {
    const booksWithContent = BOOKS.filter(b => chapters.some(ch => ch.book === b))
    const BOOK_COVERS = {
      'Book 1': { color: '#1a1a2e', accent: 'hsl(346,85%,62%)', title: 'The Book of Sevorech', subtitle: 'Book One' },
      'Book 2': { color: '#1a2e1a', accent: 'hsl(127,85%,62%)', title: 'The Book of Akatriel', subtitle: 'Book Two' },
      'Book 3': { color: '#2e2a1a', accent: 'hsl(49,85%,62%)',  title: 'The Gathering',        subtitle: 'Book Three' },
    }
    return (
      <div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: 'var(--csc)', marginBottom: 20, textAlign: 'center', letterSpacing: '.1em' }}>
          The Guardians of Lajen
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          {BOOKS.filter(b => ['Book 1','Book 2','Book 3'].includes(b)).map(book => {
            const cover = BOOK_COVERS[book] || { color: '#1a1a2e', accent: 'hsl(206,85%,62%)', title: book, subtitle: '' }
            const bookChapters = chapters.filter(ch => ch.book === book)
            const wordCount = bookChapters.reduce((s, ch) => s + (ch.word_count || 0), 0)
            const hasContent = bookChapters.length > 0
            return (
              <div key={book}
                onClick={() => { if (hasContent) { setShelfBook(book); setView('toc'); setFilterBook(book) } else setAddingChapter(true) }}
                style={{
                  width: 160, height: 240, borderRadius: '4px 12px 12px 4px',
                  background: `linear-gradient(135deg, ${cover.color} 0%, rgba(255,255,255,.05) 100%)`,
                  border: `2px solid ${cover.accent}44`,
                  boxShadow: `4px 4px 20px rgba(0,0,0,.6), inset -3px 0 8px rgba(0,0,0,.3), 0 0 0 1px ${cover.accent}22`,
                  cursor: hasContent ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: 16, textAlign: 'center', transition: '.2s', position: 'relative',
                  transform: 'perspective(400px) rotateY(-5deg)',
                }}
                onMouseEnter={e => { if (hasContent) { e.currentTarget.style.transform = 'perspective(400px) rotateY(-2deg) scale(1.04)'; e.currentTarget.style.boxShadow = `6px 6px 28px rgba(0,0,0,.7), inset -3px 0 8px rgba(0,0,0,.3), 0 0 0 1px ${cover.accent}66` }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(400px) rotateY(-5deg)'; e.currentTarget.style.boxShadow = `4px 4px 20px rgba(0,0,0,.6), inset -3px 0 8px rgba(0,0,0,.3), 0 0 0 1px ${cover.accent}22` }}
              >
                {/* Book spine line */}
                <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: `${cover.accent}44` }} />
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: cover.accent, letterSpacing: '.1em', marginBottom: 8, textTransform: 'uppercase' }}>{cover.subtitle}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: 'var(--tx)', lineHeight: 1.4, marginBottom: 12 }}>{cover.title}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)' }}>
                  {hasContent
                    ? `${bookChapters.length} ch · ${wordCount.toLocaleString()} w`
                    : <span style={{ color: cover.accent }}>+ Add chapters</span>
                  }
                </div>
                {hasContent && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {STATUSES.map(s => {
                      const n = bookChapters.filter(c => c.status === s).length
                      if (!n) return null
                      return <span key={s} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{s[0]} {n}</span>
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {/* Quick stats */}
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--mut)', marginBottom: 16 }}>
          {chapters.length} chapters · {chapters.reduce((s,ch) => s + (ch.word_count || 0), 0).toLocaleString()} total words
        </div>
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--csc)' }} onClick={() => setView('toc')}>
            📋 Full Table of Contents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--mut)' }}>View:</span>
        {[['shelf','📚 Shelf'],['toc','📋 Contents']].map(([v,l]) => (
          <button key={v} onClick={() => { setView(v); if (v === 'toc') setFilterBook('all') }}
            style={{ fontSize: 'var(--fs-xs)', padding: '3px 10px', borderRadius: 12,
              background: view === v ? 'var(--csc)' : 'none',
              color: view === v ? '#000' : 'var(--dim)',
              border: `1px solid ${view === v ? 'var(--csc)' : 'var(--brd)'}`,
              cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {view === 'shelf' && <ShelfView />}

      {view === 'toc' && (
      <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {byBook.map(({ book, chapters: chs, words }) => (
          <div key={book} style={{ padding: '6px 12px', background: 'var(--card)',
            border: '1px solid var(--brd)', borderRadius: 8, minWidth: 120 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: 'var(--csc)', marginBottom: 2 }}>{book}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{chs.length} ch</div>
            <div style={{ fontSize: 10, color: 'var(--mut)' }}>{words.toLocaleString()} words</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
              {STATUSES.map(s => {
                const n = chs.filter(c => c.status === s).length
                if (!n) return null
                return <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4,
                  background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{s} {n}</span>
              })}
            </div>
          </div>
        ))}
        <div style={{ padding: '6px 12px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: 'var(--csc)', marginBottom: 2 }}>Total</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{totalWords.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--mut)' }}>words across {chapters.length} chapters</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <input className="sx" placeholder="Search chapters and text…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={filterBook} onChange={e => setFilterBook(e.target.value)}
          style={{ fontSize: 10, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All books</option>
          {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize: 10, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--csc)' }}
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
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--csc)' }} onClick={addChapter}>Add</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAddingChapter(false)}>Cancel</button>
        </div>
      )}

      {/* Chapter list */}
      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <p>{chapters.length === 0 ? 'No chapters yet.' : 'No chapters match your filters.'}</p>
          {chapters.length === 0 && (
            <button className="btn btn-primary" style={{ background: 'var(--csc)' }} onClick={() => setAddingChapter(true)}>
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
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: 'var(--csc)',
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
                  <div style={{ fontSize: 11, color: 'var(--mut)', minWidth: 28 }}>Ch.{ch.chapter_num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>
                      {ch.title || <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>Untitled</span>}
                    </div>
                    {detectedCharsInCh.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                        {detectedCharsInCh.slice(0, 8).map(c => (
                          <span key={c.id} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8,
                            background: 'rgba(51,136,255,.12)', color: 'var(--cc)' }}>
                            {c.display_name || c.name}
                          </span>
                        ))}
                        {detectedCharsInCh.length > 8 && (
                          <span style={{ fontSize: 9, color: 'var(--mut)' }}>+{detectedCharsInCh.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10,
                    background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, whiteSpace: 'nowrap' }}>
                    {ch.status || 'Draft'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                    {wc > 0 ? wc.toLocaleString() + ' w' : 'empty'}
                  </span>
                  {ch.notes && <span style={{ fontSize: 11 }} title="Has notes">📝</span>}
                  {(ch.annotations || []).length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--cfl)' }}>🚩{ch.annotations.length}</span>
                  )}
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(ch.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer',
                      fontSize: 14, padding: '0 4px', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}

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
