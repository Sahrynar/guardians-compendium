import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { uid, TAB_RAINBOW } from '../constants'

const BOOKS = ['Book 1', 'Book 2', 'Book 3']
const STATUSES = ['Draft', 'Revision', 'Polishing', 'Done']
const STATUS_COLORS = { Draft: '#6b7280', Revision: '#f59e0b', Polishing: '#8b5cf6', Done: '#10b981' }
const COLOR = TAB_RAINBOW.manuscript

// ── Helpers ───────────────────────────────────────────────────────
function wordCount(text) { return (text || '').trim().split(/\s+/).filter(Boolean).length }

function toHTML(text) {
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

function toSubstack(text) { return '<div>' + toHTML(text) + '</div>' }
function stripFormatting(text) { return text.replace(/\*+/g, '').replace(/_/g, '') }

// ── Format bar ────────────────────────────────────────────────────
function FormatBar({ textareaRef, onUpdate }) {
  function wrap(before, after) {
    const ta = textareaRef.current; if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.slice(start, end)
    const newVal = ta.value.slice(0, start) + before + sel + (after || before) + ta.value.slice(end)
    onUpdate(newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, end + before.length) }, 0)
  }
  function insert(text) {
    const ta = textareaRef.current; if (!ta) return
    const pos = ta.selectionStart
    onUpdate(ta.value.slice(0, pos) + text + ta.value.slice(pos))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + text.length, pos + text.length) }, 0)
  }
  const btn = (label, title, action, style = {}) => (
    <button key={label} onClick={action} title={title}
      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'var(--card)',
        border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer', ...style }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--brd)', marginBottom: 8 }}>
      {btn('I', 'Italic', () => wrap('*', '*'), { fontStyle: 'italic' })}
      {btn('B', 'Bold', () => wrap('**', '**'), { fontWeight: 700 })}
      {btn('BI', 'Bold Italic', () => wrap('***', '***'), { fontWeight: 700, fontStyle: 'italic' })}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('—', 'Em dash', () => insert('—'))}
      {btn('…', 'Ellipsis', () => insert('…'))}
      {btn('* * *', 'Scene break', () => insert('\n\n***\n\n'))}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('" "', 'Curly double quotes', () => wrap('\u201c', '\u201d'))}
      {btn("' '", 'Curly single quotes', () => wrap('\u2018', '\u2019'))}
    </div>
  )
}

// ── Chapter editor (full-screen) ──────────────────────────────────
function ChapterEditor({ chapter, allChapters, chars, onSave, onClose, onPrev, onNext }) {
  const [text, setText] = useState(chapter.text || '')
  const [title, setTitle] = useState(chapter.title || '')
  const [status, setStatus] = useState(chapter.status || 'Draft')
  const [notes, setNotes] = useState(chapter.notes || '')
  const [view, setView] = useState('edit')
  const [annotations, setAnnotations] = useState(chapter.annotations || [])
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)
  const wc = wordCount(text)

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
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([stripFormatting(text)], { type: 'text/plain' }),
      })]).catch(() => navigator.clipboard?.writeText(stripFormatting(text)))
    } else { navigator.clipboard?.writeText(stripFormatting(text)) }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function save() {
    onSave({ ...chapter, title, text, status, notes, annotations, word_count: wc })
  }

  const statusCol = STATUS_COLORS[status] || '#6b7280'
  const idx = allChapters.findIndex(c => c.id === chapter.id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderBottom: '1px solid var(--brd)', background: 'var(--sf)', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: COLOR, flexShrink: 0 }}>
          {chapter.book} · Ch.{chapter.chapter_num}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chapter title…"
          style={{ flex: 2, minWidth: 160, fontSize: 13, padding: '4px 8px', background: 'var(--card)',
            border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontFamily: "'Cinzel',serif" }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ fontSize: 11, padding: '4px 8px', background: `${statusCol}22`,
            border: `1px solid ${statusCol}`, borderRadius: 6, color: statusCol, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 3 }}>
          {[['edit','✎'],['preview','👁'],['split','⧉']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: view === v ? COLOR : 'none', color: view === v ? '#000' : 'var(--dim)',
                border: `1px solid ${view === v ? COLOR : 'var(--brd)'}`, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
          {wc.toLocaleString()} w · ~{Math.round(wc / 250)} min
        </span>
        <button onClick={copyForSubstack}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, background: '#ff6719',
            color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied!' : '📋 Substack'}
        </button>
        <button onClick={() => setShowAnnotations(a => !a)}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6,
            background: showAnnotations ? 'var(--cca)' : 'none', color: showAnnotations ? '#000' : 'var(--dim)',
            border: '1px solid var(--brd)', cursor: 'pointer' }}>
          📝 {annotations.length}
        </button>
        {/* Prev/Next */}
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => { save(); onPrev && onPrev() }} disabled={!onPrev || idx <= 0}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--brd)',
              background: 'none', color: idx > 0 ? 'var(--dim)' : 'var(--mut)', cursor: idx > 0 ? 'pointer' : 'default' }}>
            ← Prev
          </button>
          <button onClick={() => { save(); onNext && onNext() }} disabled={!onNext || idx >= allChapters.length - 1}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--brd)',
              background: 'none', color: idx < allChapters.length - 1 ? 'var(--dim)' : 'var(--mut)',
              cursor: idx < allChapters.length - 1 ? 'pointer' : 'default' }}>
            Next →
          </button>
        </div>
        <button onClick={save}
          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: COLOR,
            color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Save</button>
      </div>

      {/* Detected chars */}
      {detectedChars.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px', background: 'var(--card)',
          borderBottom: '1px solid var(--brd)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase' }}>Characters:</span>
          {detectedChars.slice(0, 10).map(c => (
            <span key={c.id} style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10,
              background: `${COLOR}22`, color: COLOR, border: `1px solid ${COLOR}44` }}>
              {c.display_name || c.name}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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
        {(view === 'preview' || view === 'split') && (
          <div style={{ flex: 1, padding: '10px 40px', overflowY: 'auto',
            fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.9, color: 'var(--tx)' }}
            dangerouslySetInnerHTML={{ __html: toHTML(text) || '<p style="color:var(--mut)">Nothing to preview.</p>' }} />
        )}
        {showAnnotations && (
          <div style={{ width: 260, borderLeft: '1px solid var(--brd)', padding: '10px 12px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: COLOR, marginBottom: 10 }}>📝 Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6}
              placeholder="Chapter-level notes…"
              style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--card)',
                border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        )}
      </div>

      {/* Format guide */}
      <div style={{ padding: '4px 14px', background: 'var(--card)', borderTop: '1px solid var(--brd)',
        fontSize: 9, color: 'var(--mut)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[['*text*','italic'],['**text**','bold'],['***text***','bold italic'],['—','em dash'],['***','scene break']].map(([code, label]) => (
          <span key={code}><code style={{ color: COLOR }}>{code}</code> = {label}</span>
        ))}
      </div>
    </div>
  )
}

// ── Read mode — continuous or single-chapter ──────────────────────
function ReadMode({ chapters, startChapterId, onClose, onEdit }) {
  const [mode, setMode] = useState('all') // 'all' | 'one'
  const [currentId, setCurrentId] = useState(startChapterId || chapters[0]?.id)
  const scrollRef = useRef(null)
  const [tocOpen, setTocOpen] = useState(false)

  const displayChapters = mode === 'all' ? chapters : chapters.filter(c => c.id === currentId)
  const currentIdx = chapters.findIndex(c => c.id === currentId)

  function jumpTo(id) {
    setCurrentId(id)
    if (mode === 'all') {
      // Scroll to that chapter's anchor
      setTimeout(() => {
        const el = document.getElementById(`read-ch-${id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
    setTocOpen(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#0a0a0c', display: 'flex', flexDirection: 'column' }}>
      {/* Reader header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        borderBottom: '1px solid var(--brd)', background: 'var(--sf)', flexWrap: 'wrap' }}>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: COLOR, flex: 1 }}>
          Reading Mode
        </span>
        {/* All / One chapter toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 16, padding: '2px 4px' }}>
          {[['all','All Chapters'],['one','One Chapter']].map(([v,l]) => (
            <button key={v} onClick={() => setMode(v)}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 14, border: 'none',
                background: mode === v ? COLOR : 'none', color: mode === v ? '#000' : 'var(--dim)',
                cursor: 'pointer', transition: '.15s' }}>{l}</button>
          ))}
        </div>
        {/* Prev/Next (one-chapter mode) */}
        {mode === 'one' && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setCurrentId(chapters[currentIdx - 1]?.id)}
              disabled={currentIdx <= 0}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--brd)',
                background: 'none', color: currentIdx > 0 ? 'var(--dim)' : 'var(--mut)', cursor: currentIdx > 0 ? 'pointer' : 'default' }}>
              ← Prev
            </button>
            <button onClick={() => setCurrentId(chapters[currentIdx + 1]?.id)}
              disabled={currentIdx >= chapters.length - 1}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--brd)',
                background: 'none', color: currentIdx < chapters.length - 1 ? 'var(--dim)' : 'var(--mut)',
                cursor: currentIdx < chapters.length - 1 ? 'pointer' : 'default' }}>
              Next →
            </button>
          </div>
        )}
        {/* TOC */}
        <button onClick={() => setTocOpen(t => !t)}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--brd)',
            background: tocOpen ? COLOR : 'none', color: tocOpen ? '#000' : 'var(--dim)', cursor: 'pointer' }}>
          ☰ TOC
        </button>
        {onEdit && (
          <button onClick={() => onEdit(chapters.find(c => c.id === currentId))}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${COLOR}`,
              background: 'none', color: COLOR, cursor: 'pointer' }}>
            ✎ Edit
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* TOC sidebar */}
        {tocOpen && (
          <div style={{ width: 220, borderRight: '1px solid var(--brd)', background: 'var(--sf)',
            overflowY: 'auto', padding: '10px 0', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--mut)', padding: '0 12px 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Table of Contents
            </div>
            {BOOKS.map(book => {
              const bChs = chapters.filter(c => c.book === book)
              if (!bChs.length) return null
              return (
                <div key={book}>
                  <div style={{ fontSize: 9, color: COLOR, padding: '6px 12px 3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{book}</div>
                  {bChs.map(ch => (
                    <button key={ch.id} onClick={() => jumpTo(ch.id)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 16px',
                        fontSize: 11, background: currentId === ch.id ? `${COLOR}18` : 'none',
                        color: currentId === ch.id ? COLOR : 'var(--dim)', border: 'none', cursor: 'pointer',
                        borderLeft: currentId === ch.id ? `2px solid ${COLOR}` : '2px solid transparent' }}>
                      Ch.{ch.chapter_num} {ch.title || ''}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Reading area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {displayChapters.map((ch, i) => (
              <div key={ch.id} id={`read-ch-${ch.id}`} style={{ marginBottom: 60 }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: COLOR,
                  marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${COLOR}33` }}>
                  {ch.book} · Chapter {ch.chapter_num}
                  {ch.title && <span style={{ marginLeft: 8, color: 'var(--tx)' }}>— {ch.title}</span>}
                </div>
                {ch.text ? (
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 2, color: 'var(--tx)' }}
                    dangerouslySetInnerHTML={{ __html: toHTML(ch.text) }} />
                ) : (
                  <div style={{ color: 'var(--mut)', fontStyle: 'italic', fontSize: 13 }}>No text yet.</div>
                )}
                {i < displayChapters.length - 1 && (
                  <div style={{ textAlign: 'center', margin: '40px 0 0', color: 'var(--mut)', fontSize: 12 }}>✦ ✦ ✦</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Book cover card ───────────────────────────────────────────────
function BookCoverCard({ book, chapters, words, coverUrl, onCoverUpload, onClick, isSelected }) {
  const fileRef = useRef()
  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = chapters.filter(c => c.status === s).length; return acc
  }, {})
  const bookColor = book === 'Book 1' ? TAB_RAINBOW.flags : book === 'Book 2' ? TAB_RAINBOW.world : TAB_RAINBOW.eras

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', cursor: 'pointer', borderRadius: 10,
        border: isSelected ? `2px solid ${bookColor}` : '1px solid var(--brd)',
        overflow: 'hidden', background: 'var(--card)', transition: '.2s',
        minHeight: 200, display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Cover image or placeholder */}
      {coverUrl ? (
        <img src={coverUrl} alt={book} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ height: 160, background: `linear-gradient(160deg, ${bookColor}33, ${bookColor}11)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: bookColor, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {book}
          </div>
          <div style={{ fontSize: 28, fontFamily: "'Cinzel',serif", fontWeight: 900, color: bookColor, opacity: .3 }}>
            {['I','II','III'][BOOKS.indexOf(book)] || '?'}
          </div>
        </div>
      )}

      {/* Info bar */}
      <div style={{ padding: '8px 10px', flex: 1 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: bookColor, marginBottom: 3 }}>{book}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{chapters.length} ch</div>
        <div style={{ fontSize: 10, color: 'var(--mut)' }}>{words.toLocaleString()} words</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
          {STATUSES.map(s => statusCounts[s] ? (
            <span key={s} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4,
              background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{s} {statusCounts[s]}</span>
          ) : null)}
        </div>
      </div>

      {/* Upload cover pencil */}
      <button
        onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
        title="Upload book cover"
        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)',
          border: 'none', color: '#fff', fontSize: 12, borderRadius: '50%',
          width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: '.2s' }}
        className="cover-pencil"
      >✏</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onCoverUpload(book, f) }} />

      <style>{`.cover-pencil { opacity: 0 } div:hover > .cover-pencil { opacity: 1 }`}</style>
    </div>
  )
}

// ── Main Manuscript tab ───────────────────────────────────────────
export default function Manuscript({ db, resetKey }) {
  const chapters = (db.db.manuscript || []).sort((a, b) => {
    const bi = BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseInt(a.chapter_num) || 0) - (parseInt(b.chapter_num) || 0)
  })
  const chars = db.db.characters || []

  // View state
  const [view, setView] = useState('shelf') // 'shelf' | 'contents' | 'read' | 'edit'
  const [selectedBook, setSelectedBook] = useState(null)
  const [editingChapter, setEditingChapter] = useState(null)
  const [readStartId, setReadStartId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterBook, setFilterBook] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [addingChapter, setAddingChapter] = useState(false)
  const [newForm, setNewForm] = useState({ book: 'Book 1', chapter_num: '', title: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Reset to shelf when tab is clicked again
  useEffect(() => { setView('shelf') }, [resetKey])

  // Book covers from settings
  const [covers, setCovers] = useState({})
  useEffect(() => {
    try {
      const saved = db.settings?.manuscript_covers
      if (saved) setCovers(typeof saved === 'string' ? JSON.parse(saved) : saved)
    } catch {}
  }, [db.settings])

  function uploadCover(book, file) {
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target.result
      const next = { ...covers, [book]: url }
      setCovers(next)
      db.saveSetting('manuscript_covers', JSON.stringify(next))
      // Add to image library
      db.upsertEntry('images', {
        id: uid(), name: `Cover — ${book}`, url,
        source: 'cover', created: new Date().toISOString(),
      })
    }
    reader.readAsDataURL(file)
  }

  const totalWords = chapters.reduce((s, ch) => s + (ch.word_count || wordCount(ch.text || '')), 0)
  const byBook = BOOKS.map(b => ({
    book: b,
    chapters: chapters.filter(ch => ch.book === b),
    words: chapters.filter(ch => ch.book === b).reduce((s, ch) => s + (ch.word_count || wordCount(ch.text||'')), 0),
  }))

  const filtered = chapters.filter(ch => {
    const mb = filterBook === 'all' || ch.book === filterBook
    const ms = filterStatus === 'all' || ch.status === filterStatus
    const mq = !search || (ch.title||'').toLowerCase().includes(search.toLowerCase()) ||
      (ch.text||'').toLowerCase().includes(search.toLowerCase())
    return mb && ms && mq
  })

  function saveChapter(ch) {
    db.upsertEntry('manuscript', ch)
    setEditingChapter(null)
    setView('contents')
  }

  function addChapter() {
    if (!newForm.chapter_num) return
    const ch = { id: uid(), book: newForm.book, chapter_num: newForm.chapter_num, title: newForm.title,
      text: '', status: 'Draft', notes: '', annotations: [], word_count: 0 }
    db.upsertEntry('manuscript', ch)
    setAddingChapter(false)
    setNewForm({ book: 'Book 1', chapter_num: '', title: '' })
    setEditingChapter(ch)
    setView('edit')
  }

  function navigateChapter(dir) {
    if (!editingChapter) return
    const idx = chapters.findIndex(c => c.id === editingChapter.id)
    const next = chapters[idx + dir]
    if (next) { saveChapter(editingChapter); setEditingChapter(next) }
  }

  // ── Read mode ──
  if (view === 'read') {
    return (
      <ReadMode
        chapters={filterBook === 'all' ? chapters : chapters.filter(c => c.book === filterBook)}
        startChapterId={readStartId}
        onClose={() => setView('contents')}
        onEdit={ch => { setEditingChapter(ch); setView('edit') }}
      />
    )
  }

  // ── Chapter editor ──
  if (view === 'edit' && editingChapter) {
    return (
      <ChapterEditor
        chapter={editingChapter}
        allChapters={chapters}
        chars={chars}
        onSave={saveChapter}
        onClose={() => { setView('contents') }}
        onPrev={() => navigateChapter(-1)}
        onNext={() => navigateChapter(1)}
      />
    )
  }

  // ── Shelf view ──
  if (view === 'shelf') {
    return (
      <div>
        {/* Total stats */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: 'var(--mut)' }}>
            {chapters.length} chapters · {totalWords.toLocaleString()} total words
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setView('contents')}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: `1px solid ${COLOR}`,
                background: 'none', color: COLOR, cursor: 'pointer' }}>
              ☰ All Chapters
            </button>
            <button onClick={() => { setFilterBook('all'); setReadStartId(chapters[0]?.id); setView('read') }}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none',
                background: COLOR, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
              👁 Read
            </button>
          </div>
        </div>

        {/* Book cover cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {byBook.map(({ book, chapters: bChs, words }) => (
            <BookCoverCard
              key={book}
              book={book}
              chapters={bChs}
              words={words}
              coverUrl={covers[book] || null}
              onCoverUpload={uploadCover}
              isSelected={selectedBook === book}
              onClick={() => {
                setSelectedBook(book)
                setFilterBook(book)
                setView('contents')
              }}
            />
          ))}
        </div>

        {/* Hover hint */}
        <div style={{ fontSize: 10, color: 'var(--mut)', textAlign: 'center', marginTop: 16 }}>
          Click a book to view chapters · ✏ (hover cover) to upload cover image
        </div>
      </div>
    )
  }

  // ── Contents view ──
  return (
    <div>
      {/* Back to shelf */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setView('shelf')}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: '1px solid var(--brd)',
            background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
          ← Shelf
        </button>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: COLOR, flex: 1 }}>
          {filterBook === 'all' ? 'All Chapters' : filterBook}
        </div>
        <button onClick={() => { setReadStartId(filtered[0]?.id); setView('read') }}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: 'none',
            background: COLOR, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
          👁 Read
        </button>
        <button onClick={() => setAddingChapter(true)}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: 'none',
            background: COLOR, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
          + Chapter
        </button>
      </div>

      {/* Filters */}
      <div className="tbar" style={{ padding: '0 0 8px' }}>
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
      </div>

      {/* Add chapter form */}
      {addingChapter && (
        <div style={{ padding: '10px 14px', background: 'var(--card)', border: `1px solid ${COLOR}`,
          borderRadius: 8, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Book</label>
            <select value={newForm.book} onChange={e => setNewForm(p => ({ ...p, book: e.target.value }))}>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Chapter #</label>
            <input type="number" value={newForm.chapter_num}
              onChange={e => setNewForm(p => ({ ...p, chapter_num: e.target.value }))}
              style={{ width: 80 }} placeholder="1" />
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label>Title (optional)</label>
            <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ background: COLOR, color: '#000' }} onClick={addChapter}>Add</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAddingChapter(false)}>Cancel</button>
        </div>
      )}

      {/* Chapter list by book */}
      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <p>{chapters.length === 0 ? 'No chapters yet.' : 'No chapters match your filters.'}</p>
        </div>
      )}

      {BOOKS.filter(b => filterBook === 'all' || b === filterBook).map(book => {
        const bookChapters = filtered.filter(ch => ch.book === book)
        if (!bookChapters.length) return null
        return (
          <div key={book} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: COLOR,
              marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${COLOR}33` }}>
              {book}
            </div>
            {bookChapters.map(ch => {
              const sc = STATUS_COLORS[ch.status] || '#6b7280'
              const wc = ch.word_count || wordCount(ch.text || '')
              return (
                <div key={ch.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8,
                    marginBottom: 4, cursor: 'pointer', transition: '.12s', borderLeft: `3px solid ${sc}` }}
                  onClick={() => { setEditingChapter(ch); setView('edit') }}>
                  <div style={{ fontSize: 11, color: 'var(--mut)', minWidth: 28 }}>Ch.{ch.chapter_num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>
                      {ch.title || <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>Untitled</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setReadStartId(ch.id); setFilterBook(ch.book); setView('read') }}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLOR}44`,
                      background: 'none', color: COLOR, cursor: 'pointer', flexShrink: 0 }}>
                    👁
                  </button>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10,
                    background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {ch.status || 'Draft'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {wc > 0 ? wc.toLocaleString() + ' w' : 'empty'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(ch.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}
          </div>
        )
      })}

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
