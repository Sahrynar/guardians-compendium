import { useEffect, useMemo, useRef, useState } from 'react'
import { TAB_RAINBOW, uid } from '../constants'
import { parseSetting } from '../hooks/useDB'

const BOOKS = ['Book 1', 'Book 2', 'Book 3']
const MS_COLOR = TAB_RAINBOW.manuscript
const STATUSES = ['Draft', 'Revision', 'Polishing', 'Done']
const STATUS_COLORS = { Draft: '#6b7280', Revision: '#f59e0b', Polishing: '#8b5cf6', Done: '#10b981' }
const SHELF_COLS = { XS: 6, S: 4, M: 3, L: 2, XL: 1 }
const TOC_COLS = { XS: 5, S: 4, M: 3, L: 2, XL: 1 }
const navBtn = { fontSize: '0.85em', padding: '3px 10px', borderRadius: 6, background: 'none', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }
const sizeBtn = active => ({ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, background: active ? MS_COLOR : 'none', color: active ? '#000' : 'var(--dim)', border: `1px solid ${active ? MS_COLOR : 'var(--brd)'}`, cursor: 'pointer' })

function toHTML(text) {
  if (!text) return ''
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  t = t.replace(/^[ \t]*\*{3}[ \t]*$/gm, '\n\n___SCENE_BREAK___\n\n')
  t = t.replace(/^[ \t]*---[ \t]*$/gm, '\n\n___HR___\n\n')
  t = t.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*(.*?)\*/g, '<em>$1</em>')
  t = t.replace(/_(.*?)_/g, '<em>$1</em>')
  const hasBlankLines = /\n\s*\n/.test(t)
  const paras = hasBlankLines ? t.split(/\n{2,}/) : t.split(/\n/)
  return paras.map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ''
    if (trimmed === '___SCENE_BREAK___') return '<p style="text-align:center;letter-spacing:.3em;margin:1.5em 0">* * *</p>'
    if (trimmed === '___HR___') return '<hr>'
    if (trimmed.startsWith('<')) return trimmed
    const flowed = hasBlankLines ? trimmed.replace(/\n+/g, ' ').replace(/\s+/g, ' ') : trimmed
    return '<p>' + flowed + '</p>'
  }).filter(Boolean).join('\n')
}

function toSubstack(text) {
  return '<div>' + toHTML(text) + '</div>'
}

function stripFormatting(text) {
  return text.replace(/\*+/g, '').replace(/_/g, '')
}

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length
}

function FormatBar({ textareaRef, onUpdate }) {
  function wrap(before, after) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
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
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(pos + text.length, pos + text.length)
    }, 0)
  }

  const btn = (label, title, action) => (
    <button key={label} onClick={action} title={title} style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 5, background: 'var(--card)', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid var(--brd)', marginBottom: 8 }}>
      {btn('I', 'Italic', () => wrap('*', '*'))}
      {btn('B', 'Bold', () => wrap('**', '**'))}
      {btn('BI', 'Bold italic', () => wrap('***', '***'))}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('—', 'Insert em dash', () => insert('—'))}
      {btn('…', 'Insert ellipsis', () => insert('…'))}
      {btn('* * *', 'Scene break', () => insert('\n\n***\n\n'))}
      <div style={{ width: 1, background: 'var(--brd)', margin: '0 4px' }} />
      {btn('" "', 'Curly double quotes', () => wrap('\u201c', '\u201d'))}
      {btn("' '", 'Curly single quotes', () => wrap('\u2018', '\u2019'))}
    </div>
  )
}

const navSelect = { fontSize: '0.85em', padding: '3px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', maxWidth: 240 }

function ChapterEditor({ chapter, chars, allChapters, onSave, onClose, onNavigateToChapter, onBackToShelf, onBackToTOC, onHome }) {
  const [text, setText] = useState(chapter.text || '')
  const [title, setTitle] = useState(chapter.title || '')
  const [status, setStatus] = useState(chapter.status || 'Draft')
  const [notes, setNotes] = useState(chapter.notes || '')
  const [view, setView] = useState('edit')
  const [annotations, setAnnotations] = useState(chapter.annotations || [])
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    try { return parseFloat(localStorage.getItem('manuscript_fontsize')) || 1.0 } catch { return 1.0 }
  })
  const [indentParas, setIndentParas] = useState(() => {
    try { return localStorage.getItem('manuscript_indent') !== 'off' } catch { return true }
  })
  const textareaRef = useRef(null)
  const wc = wordCount(text)

  useEffect(() => {
    setText(chapter.text || '')
    setTitle(chapter.title || '')
    setStatus(chapter.status || 'Draft')
    setNotes(chapter.notes || '')
    setAnnotations(chapter.annotations || [])
  }, [chapter.id])

  const detectedChars = useMemo(() => {
    if (!text) return []
    return chars.filter(c => {
      const name = c.display_name || c.name || ''
      const aliases = (c.aliases || '').split(',').map(a => a.trim()).filter(Boolean)
      return [name, ...aliases].some(n => n && text.includes(n))
    })
  }, [text, chars])

  const myIdx = allChapters.findIndex(c => c.id === chapter.id)
  const prevChapter = myIdx > 0 ? allChapters[myIdx - 1] : null
  const nextChapter = myIdx < allChapters.length - 1 ? allChapters[myIdx + 1] : null

  function navPrev() { if (prevChapter) onNavigateToChapter(prevChapter.id) }
  function navNext() { if (nextChapter) onNavigateToChapter(nextChapter.id) }

  function changeFontSize(delta) {
    setFontSize(s => {
      const next = Math.max(0.9, Math.min(2.0, s + delta))
      try { localStorage.setItem('manuscript_fontsize', String(next)) } catch {}
      return next
    })
  }

  function toggleIndent() {
    setIndentParas(v => {
      const next = !v
      try { localStorage.setItem('manuscript_indent', next ? 'on' : 'off') } catch {}
      return next
    })
  }

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

  function save() {
    onSave({ ...chapter, title, text, status, notes, annotations, word_count: wc })
  }

  const statusCol = STATUS_COLORS[status] || '#6b7280'
  const previewBaseStyle = {
    flex: 1,
    overflowY: 'auto',
    fontFamily: 'Georgia, serif',
    color: 'var(--tx)',
    maxWidth: '75ch',
    margin: '0 auto',
    '--p-indent': indentParas ? '2em' : '0',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--brd)', background: 'var(--sf)', flexWrap: 'wrap' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chapter title..." style={{ flex: 2, minWidth: 200, fontSize: '1em', padding: '4px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontFamily: "'Cinzel',serif" }} />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontSize: '0.85em', padding: '4px 8px', background: `${statusCol}22`, border: `1px solid ${statusCol}`, borderRadius: 6, color: statusCol, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: '0.77em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>{wc.toLocaleString()} words</span>
        <button onClick={copyForSubstack} style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 6, background: MS_COLOR, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied ? '✓ Copied!' : '📋 Copy for Substack'}</button>
        <span style={{ fontSize: '0.77em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>Notes ({annotations.length})</span>
        <button onClick={save} style={{ fontSize: '0.85em', padding: '5px 14px', borderRadius: 6, background: MS_COLOR, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Save</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '1.38em' }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--brd)', background: 'var(--sf)', flexWrap: 'wrap' }}>
        <button onClick={() => changeFontSize(-0.1)} style={{ fontSize: '0.85em', padding: '3px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }}>A−</button>
        <button onClick={() => changeFontSize(0.1)} style={{ fontSize: '0.85em', padding: '3px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }}>A+</button>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{Math.round(fontSize * 100)}%</span>
        <button onClick={toggleIndent} style={{ fontSize: '0.85em', padding: '3px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }}>{indentParas ? '⇥ Indent: ON' : '⇥ Indent: OFF'}</button>
        <div style={{ display: 'flex', gap: 3 }}>
          {[['edit', '✎'], ['preview', '👁'], ['split', '⧉'], ['read', '📖']].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} title={v} style={{ fontSize: '0.85em', padding: '3px 8px', borderRadius: 6, background: view === v ? 'var(--csc)' : 'none', border: '1px solid var(--brd)', color: 'var(--tx)', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        {view !== 'read' && <button onClick={() => setShowAnnotations(a => !a)} style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 6, background: showAnnotations ? 'var(--cca)' : 'none', color: showAnnotations ? '#000' : 'var(--dim)', border: '1px solid var(--brd)', cursor: 'pointer' }}>📝 Notes ({annotations.length})</button>}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid var(--brd)', background: 'var(--card)', fontSize: '0.85em' }}>
        <button onClick={onHome} title="Home" style={navBtn}>🏠</button>
        <button onClick={onBackToShelf} title="Shelf" style={navBtn}>📚</button>
        <button onClick={() => onBackToTOC(chapter.book)} title="Contents" style={navBtn}>📖</button>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--brd)' }} />
        <button onClick={navPrev} disabled={!prevChapter} title="Previous chapter" style={{ ...navBtn, opacity: prevChapter ? 1 : 0.5, cursor: prevChapter ? 'pointer' : 'default' }}>←</button>
        <button onClick={navNext} disabled={!nextChapter} title="Next chapter" style={{ ...navBtn, opacity: nextChapter ? 1 : 0.5, cursor: nextChapter ? 'pointer' : 'default' }}>→</button>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--brd)' }} />
        <select value={chapter.id} onChange={e => onNavigateToChapter(e.target.value)} style={navSelect}>
          {allChapters.map(c => (
            <option key={c.id} value={c.id}>{c.book} · Ch {c.chapter_num}{c.title ? ` · ${c.title}` : ''}</option>
          ))}
        </select>
      </div>

      {detectedChars.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px', background: 'var(--card)', borderBottom: '1px solid var(--brd)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.69em', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Characters:</span>
          {detectedChars.map(c => (
            <span key={c.id} style={{ fontSize: '0.77em', padding: '1px 8px', borderRadius: 10, background: 'rgba(51,136,255,.15)', color: 'var(--cc)', border: '1px solid rgba(51,136,255,.3)' }}>{c.display_name || c.name}</span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {(view === 'edit' || view === 'split') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px', overflow: 'hidden', borderRight: view === 'split' ? '1px solid var(--brd)' : 'none' }}>
            <FormatBar textareaRef={textareaRef} onUpdate={setText} />
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} style={{ flex: 1, resize: 'none', fontSize: `${fontSize}em`, lineHeight: 1.8, padding: '8px 0', background: 'transparent', border: 'none', color: 'var(--tx)', outline: 'none', fontFamily: 'Georgia, serif', overflowY: 'auto' }} placeholder="Paste or type your chapter here. Use *italic*, **bold**, — for em dash, *** for scene break." />
          </div>
        )}

        {(view === 'preview' || view === 'split') && (
          <div style={{ ...previewBaseStyle, fontSize: `${fontSize * 1.08}em`, lineHeight: 1.9, padding: '20px 40px' }}>
            <style>{`
              .ms-preview p { text-indent: var(--p-indent, 2em); margin: 0; }
              .ms-preview p + p { margin-top: 0; }
              .ms-preview p:first-of-type { text-indent: 0; }
            `}</style>
            <div className="ms-preview" dangerouslySetInnerHTML={{ __html: toHTML(text) || '<p style="color:var(--mut)">Nothing to preview yet.</p>' }} />
          </div>
        )}

        {view === 'read' && (
          <div style={{ ...previewBaseStyle, fontSize: `${fontSize * 1.2}em`, lineHeight: 2, padding: '40px 60px' }}>
            <style>{`
              .ms-preview p { text-indent: var(--p-indent, 2em); margin: 0; }
              .ms-preview p + p { margin-top: 0; }
              .ms-preview p:first-of-type { text-indent: 0; }
            `}</style>
            <div className="ms-preview" dangerouslySetInnerHTML={{ __html: toHTML(text) || '<p style="color:var(--mut)">Nothing to read yet.</p>' }} />
          </div>
        )}

        {showAnnotations && view !== 'read' && (
          <div style={{ width: 280, borderLeft: '1px solid var(--brd)', padding: '10px 14px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: 'var(--cca)', marginBottom: 10 }}>📝 Chapter Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Chapter-level notes, to-do, revision thoughts..." style={{ width: '100%', fontSize: '0.85em', padding: '6px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ fontSize: '0.77em', fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Passage Flags</div>
            {annotations.length === 0 && <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>No passage flags yet. Select text and add a flag.</div>}
            {annotations.map(ann => (
              <div key={ann.id} style={{ marginBottom: 8, padding: '6px 8px', background: 'var(--card)', borderLeft: '3px solid var(--cfl)', borderRadius: '0 6px 6px 0', fontSize: '0.77em' }}>
                <div style={{ color: 'var(--cfl)', fontStyle: 'italic', marginBottom: 3 }}>"{ann.passage}"</div>
                <div style={{ color: 'var(--tx)' }}>{ann.note}</div>
                <button onClick={() => setAnnotations(a => a.filter(x => x.id !== ann.id))} style={{ fontSize: '0.69em', color: '#ff3355', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '4px 14px', background: 'var(--card)', borderTop: '1px solid var(--brd)', fontSize: '0.69em', color: 'var(--mut)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[['*text*', 'italic'], ['**text**', 'bold'], ['***text***', 'bold italic'], ['—', 'em dash'], ['…', 'ellipsis'], ['***', 'scene break']].map(([code, label]) => (
          <span key={code}><code style={{ color: 'var(--cca)' }}>{code}</code> = {label}</span>
        ))}
      </div>
    </div>
  )
}

export default function Manuscript({ db, navSearch, goTo }) {
  const chapters = (db.db.manuscript || []).sort((a, b) => {
    const bi = BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseInt(a.chapter_num) || 0) - (parseInt(b.chapter_num) || 0)
  })
  const chars = db.db.characters || []
  const [search, setSearch] = useState('')
  const [filterBook, setFilterBook] = useState('all')
  const [tocBook, setTocBook] = useState(null)
  const [coverLightbox, setCoverLightbox] = useState(null)
  const [editCovers, setEditCovers] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingChapter, setEditingChapter] = useState(null)
  const [addingChapter, setAddingChapter] = useState(false)
  const [newForm, setNewForm] = useState({ book: 'Book 1', chapter_num: '', title: '' })
  const [shelfSize, setShelfSize] = useState(() => {
    try { return localStorage.getItem('manuscript_shelf_size') || 'M' } catch { return 'M' }
  })
  const [tocSize, setTocSize] = useState(() => {
    try { return localStorage.getItem('manuscript_toc_size') || 'L' } catch { return 'L' }
  })

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && coverLightbox) setCoverLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [coverLightbox])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = chapters.find(x => x.id === targetId)
      if (!entry) return
      setEditingChapter(entry)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [chapters])

  const filtered = chapters.filter(ch => {
    const mb = filterBook === 'all' || ch.book === filterBook
    const ms = filterStatus === 'all' || ch.status === filterStatus
    const mq = !search || (ch.title || '').toLowerCase().includes(search.toLowerCase()) || (ch.text || '').toLowerCase().includes(search.toLowerCase())
    return mb && ms && mq
  })

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || wordCount(ch.text || '')), 0)
  const byBook = BOOKS.map(book => ({
    book,
    chapters: chapters.filter(ch => ch.book === book),
    words: chapters.filter(ch => ch.book === book).reduce((sum, ch) => sum + (ch.word_count || wordCount(ch.text || '')), 0),
  }))

  function changeShelfSize(sz) {
    setShelfSize(sz)
    try { localStorage.setItem('manuscript_shelf_size', sz) } catch {}
  }

  function changeTocSize(sz) {
    setTocSize(sz)
    try { localStorage.setItem('manuscript_toc_size', sz) } catch {}
  }

  function saveChapter(ch) {
    db.upsertEntry('manuscript', ch)
    setEditingChapter(null)
  }

  function navigateToChapter(chId) {
    const ch = chapters.find(c => c.id === chId)
    if (ch) setEditingChapter(ch)
  }

  function backToShelf() {
    setEditingChapter(null)
    setTocBook(null)
  }

  function backToTOC(book) {
    setEditingChapter(null)
    setTocBook(book)
  }

  function goHome() {
    setEditingChapter(null)
    setTocBook(null)
    goTo?.('dashboard')
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {['XS', 'S', 'M', 'L', 'XL'].map(l => <button key={l} onClick={() => changeShelfSize(l)} style={sizeBtn(shelfSize === l)}>{l}</button>)}
            </div>
            <button onClick={() => setEditCovers(e => !e)} style={{ fontSize: '0.77em', padding: '3px 12px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${editCovers ? MS_COLOR : 'var(--brd)'}`, background: editCovers ? '#aacc0022' : 'none', color: editCovers ? MS_COLOR : 'var(--dim)' }}>
              {editCovers ? '✓ Done' : '✎ Edit covers'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SHELF_COLS[shelfSize]}, minmax(0, 1fr))`, gap: 20, marginBottom: 24 }}>
            {byBook.map(({ book, chapters: bookChapters, words }) => {
              const meta = parseSetting(db.settings?.[`manuscript_book_${book.replace(/ /g, '_')}`])
              const cover = meta.cover || ''
              const accent = meta.accent || MS_COLOR
              return (
                <div key={book} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', maxWidth: 200, aspectRatio: '2 / 3', borderRadius: '4px 10px 10px 4px', overflow: 'hidden', border: `3px solid ${accent}`, background: cover ? 'transparent' : `${accent}22`, boxShadow: '4px 6px 18px rgba(0,0,0,.55)', cursor: 'pointer' }} onClick={() => {
                    const meta2 = parseSetting(db.settings?.[`manuscript_book_${book.replace(/ /g, '_')}`])
                    const cover2 = meta2?.cover || ''
                    if (cover2) setCoverLightbox({ book, cover: cover2 })
                    else { setTocBook(book); setFilterBook(book) }
                  }}>
                    {cover
                      ? <img src={cover} alt={book} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '2.2em', opacity: 0.25 }}>📖</span></div>
                    }
                  </div>
                  {editCovers && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <label title="Upload cover image" style={{ cursor: 'pointer', fontSize: '1.08em', color: MS_COLOR }}>
                        🖼
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={ev => {
                          const file = ev.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = e2 => {
                            const key = `manuscript_book_${book.replace(/ /g, '_')}`
                            const existing = parseSetting(db.settings?.[key])
                            db.saveSetting(key, JSON.stringify({ ...existing, cover: e2.target.result }))
                          }
                          reader.readAsDataURL(file)
                        }} />
                      </label>
                      <input type="color" value={accent} title="Accent colour" style={{ width: 22, height: 22, padding: 0, border: 'none', borderRadius: 3, cursor: 'pointer' }} onChange={ev => {
                        const key = `manuscript_book_${book.replace(/ /g, '_')}`
                        const existing = parseSetting(db.settings?.[key])
                        db.saveSetting(key, JSON.stringify({ ...existing, accent: ev.target.value }))
                      }} />
                      {cover && (
                        <button title="Remove cover" style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', padding: 0 }} onClick={() => {
                          const key = `manuscript_book_${book.replace(/ /g, '_')}`
                          const existing = parseSetting(db.settings?.[key])
                          db.saveSetting(key, JSON.stringify({ ...existing, cover: '' }))
                        }}>✕</button>
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: editCovers ? 4 : 8, textAlign: 'center', width: '100%' }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: accent, fontWeight: 700 }}>{book}</div>
                    <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 2 }}>{bookChapters.length} chapters · {words.toLocaleString()} words</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {STATUSES.map(s => {
                        const n = bookChapters.filter(ch => ch.status === s).length
                        if (!n) return null
                        return <span key={s} style={{ fontSize: '0.62em', padding: '1px 5px', borderRadius: 3, background: `${STATUS_COLORS[s]}22`, color: STATUS_COLORS[s] }}>{n} {s}</span>
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.77em', color: 'var(--dim)', marginBottom: 2 }}>Total</div>
            <div style={{ fontSize: '1.69em', fontWeight: 700, color: 'var(--tx)' }}>{totalWords.toLocaleString()}</div>
            <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>words · {chapters.length} ch</div>
          </div>
        </>
      )}

      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        {tocBook && (
          <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
            {['XS', 'S', 'M', 'L', 'XL'].map(l => <button key={l} onClick={() => changeTocSize(l)} style={sizeBtn(tocSize === l)}>{l}</button>)}
          </div>
        )}
        {!tocBook && <div style={{ marginRight: 'auto' }} />}
        <input className="sx" placeholder="Search chapters and text..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={filterBook} onChange={e => setFilterBook(e.target.value)} style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All books</option>
          {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: '0.77em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" style={{ background: MS_COLOR }} onClick={() => setAddingChapter(true)}>+ Add Chapter</button>
      </div>

      {addingChapter && (
        <div style={{ padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--csc)', borderRadius: 8, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Book</label>
            <select value={newForm.book} onChange={e => setNewForm(p => ({ ...p, book: e.target.value }))}>{BOOKS.map(b => <option key={b} value={b}>{b}</option>)}</select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Chapter #</label>
            <input type="number" value={newForm.chapter_num} onChange={e => setNewForm(p => ({ ...p, chapter_num: e.target.value }))} style={{ width: 80 }} placeholder="e.g. 1" />
          </div>
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <label>Title (optional)</label>
            <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Barn power manifestation" />
          </div>
          <button className="btn btn-primary btn-sm" style={{ background: MS_COLOR }} onClick={addChapter}>Add</button>
          <button className="btn btn-outline btn-sm" onClick={() => setAddingChapter(false)}>Cancel</button>
        </div>
      )}

      {tocBook && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--brd)', flexWrap: 'wrap' }}>
            <button onClick={() => { setTocBook(null); setFilterBook('all'); setCoverLightbox(null) }} style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>← Back to Shelf</button>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: MS_COLOR, fontWeight: 700 }}>{tocBook}</div>
            <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginLeft: 'auto' }}>{chapters.filter(c => c.book === tocBook).length} chapters · {chapters.filter(c => c.book === tocBook).reduce((sum, c) => sum + (c.word_count || wordCount(c.text || '')), 0).toLocaleString()} words</div>
          </div>

          {filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📖</div>
              <p>{chapters.length === 0 ? 'No chapters yet.' : 'No chapters match your filters.'}</p>
            </div>
          )}

          {tocSize === 'XL' ? (
            <div style={{ maxWidth: '65ch', margin: '0 auto', padding: '20px 40px' }}>
              {filtered.filter(ch => ch.book === tocBook).map(ch => (
                <div key={ch.id} onClick={() => setEditingChapter(ch)}
                  style={{ display: 'flex', alignItems: 'baseline', cursor: 'pointer', padding: '10px 0', borderBottom: '1px dotted var(--brd)', fontFamily: 'Georgia, serif' }}>
                  <span style={{ fontSize: '1em', color: MS_COLOR, minWidth: 60 }}>Ch {ch.chapter_num}</span>
                  <span style={{ flex: 1, fontSize: '1.08em' }}>{ch.title || '(Untitled)'}</span>
                  <span style={{ fontSize: '0.85em', color: 'var(--mut)' }}>{ch.word_count || 0} words</span>
                </div>
              ))}
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TOC_COLS[tocSize]}, minmax(0, 1fr))`, gap: 8 }}>
            {filtered.filter(ch => ch.book === tocBook).map(ch => {
              const wc = ch.word_count || wordCount(ch.text || '')
              const sc = STATUS_COLORS[ch.status] || '#6b7280'
              return (
                <div key={ch.id} id={`gcomp-entry-${ch.id}`} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--brd)' }} onClick={() => setEditingChapter(ch)}>
                  <div style={{ fontSize: '0.75em', color: MS_COLOR, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }}>Chapter {ch.chapter_num}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.02em', color: 'var(--tx)' }}>{ch.title || <span style={{ color: 'var(--mut)', fontStyle: 'italic' }}>Untitled</span>}</div>
                  <div style={{ fontSize: '0.75em', color: 'var(--mut)', marginTop: 6 }}>{wc.toLocaleString()} words · <span style={{ color: sc }}>{ch.status || 'Draft'}</span></div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}

      {coverLightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setCoverLightbox(null)}>
          <div style={{ position: 'relative', maxWidth: '40vw', maxHeight: '80vh' }}>
            <img src={coverLightbox.cover} alt={coverLightbox.book} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 48px rgba(0,0,0,.8)', border: '2px solid rgba(255,255,255,.15)', cursor: 'pointer' }} onClick={e => {
              e.stopPropagation()
              const book = coverLightbox.book
              setCoverLightbox(null)
              setTocBook(book)
              setFilterBook(book)
            }} />
            <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: '0.85em' }}>Click image to open book · Click outside or ✕ to close</div>
            <button onClick={e => { e.stopPropagation(); setCoverLightbox(null) }} style={{ position: 'absolute', top: -12, right: -12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)', fontSize: '1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      )}

      {editingChapter && (
        <ChapterEditor chapter={editingChapter} chars={chars} allChapters={chapters} onSave={saveChapter} onClose={() => setEditingChapter(null)} onNavigateToChapter={navigateToChapter} onBackToShelf={backToShelf} onBackToTOC={backToTOC} onHome={() => goHome()} />
      )}
    </div>
  )
}
