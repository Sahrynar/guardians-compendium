import { useState, useEffect, useRef, useCallback } from 'react'
import { uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Sticky color presets (pastel — bg, border, text) ─────────────
const STICKY_COLORS = [
  { id: 'yellow',   bg: '#fffde7', border: '#f9a825', text: '#5d4037', label: '🟡 Yellow' },
  { id: 'pink',     bg: '#fce4ec', border: '#e91e63', text: '#880e4f', label: '🩷 Pink' },
  { id: 'mint',     bg: '#e8f5e9', border: '#43a047', text: '#1b5e20', label: '🟢 Mint' },
  { id: 'lavender', bg: '#ede7f6', border: '#7e57c2', text: '#311b92', label: '💜 Lavender' },
  { id: 'peach',    bg: '#fff3e0', border: '#fb8c00', text: '#bf360c', label: '🍑 Peach' },
  { id: 'sky',      bg: '#e3f2fd', border: '#1e88e5', text: '#0d47a1', label: '🔵 Sky' },
  { id: 'coral',    bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', label: '🪸 Coral' },
  { id: 'lilac',    bg: '#f3e5f5', border: '#ab47bc', text: '#4a148c', label: '🌸 Lilac' },
]

// Default tags
const DEFAULT_TAGS = [
  { id: 'name-person', label: 'Name — Person', color: '#c966ff' },
  { id: 'name-place',  label: 'Name — Place',  color: '#3388ff' },
  { id: 'name-thing',  label: 'Name — Thing',  color: '#00ccaa' },
  { id: 'magic',       label: 'Magic',          color: '#ff44aa' },
  { id: 'lore',        label: 'Lore',           color: '#ffaa33' },
  { id: 'history',     label: 'History',        color: '#cc6644' },
  { id: 'language',    label: 'Language',       color: '#00e5cc' },
  { id: 'plot-idea',   label: 'Plot Idea',      color: '#ff3355' },
  { id: 'vibe',        label: 'Vibe / Mood',    color: '#9933ff' },
  { id: 'unsorted',    label: 'Unsorted',       color: '#666688' },
]

const JOURNAL_COLOR = '#38b000'
const IDEAS_LS_KEY = 'gcomp_ideas'
const IDEAS_CATEGORIES = [
  { id: 'names', label: 'Names' },
  { id: 'words', label: 'Words' },
  { id: 'phrases', label: 'Phrases' },
]

// Stable tilt from ID (deterministic, no re-render flicker)
function stickyTilt(id) {
  let h = 0
  for (let i = 0; i < (id||'').length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h % 5) - 2) * 0.8 // -1.6° to +1.6°
}

// ── Persistence ──────────────────────────────────────────────────
function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── QuickCapture ─────────────────────────────────────────────────
function QuickCapture({ tags, onAddSticky, onOpenLongForm }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('unsorted')
  const [color, setColor] = useState('yellow')
  const [quickMode, setQuickMode] = useState('longform')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  function submitSticky() {
    if (!text.trim()) return
    onAddSticky({ text: text.trim(), tag, color, size: 'normal', pinned: false })
    setText('')
  }

  function submitQuickCapture() {
    if (!text.trim()) return
    if (quickMode === 'sticky') submitSticky()
    else {
      onOpenLongForm(text.trim())
      setText('')
    }
  }

  function selectMode(mode) {
    setQuickMode(mode)
    setMenuOpen(false)
  }

  const quickLabel = quickMode === 'sticky' ? '📌 Sticky' : '📝 Long-form note'

  function handleCtrlQ(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
      e.preventDefault()
      submitQuickCapture()
    }
  }

  function submitStickyOnly() {
    if (!text.trim()) return
    submitSticky()
    setText('')
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 12, marginBottom: 12 }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: JOURNAL_COLOR, marginBottom: 8 }}>✦ Quick Capture</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitQuickCapture()
          handleCtrlQ(e)
        }}
        placeholder="Capture a thought, name, idea…"
        style={{ width: '100%', minHeight: 70, padding: '6px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 'var(--r)', color: 'var(--tx)', fontSize: '0.92em', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={tag} onChange={e => setTag(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', flex: 1, minWidth: 80 }}>
          {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={color} onChange={e => setColor(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', flex: 1, minWidth: 80 }}>
          {STICKY_COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button className="btn btn-sm btn-outline" style={{ flexShrink: 0 }} onClick={submitStickyOnly}>
          Save Sticky
        </button>
        <div ref={menuRef} style={{ display: 'flex', position: 'relative', flexShrink: 0 }}>
          <button className="btn btn-sm" style={{ background: JOURNAL_COLOR, color: '#000', borderTopRightRadius: 0, borderBottomRightRadius: 0 }} onClick={submitQuickCapture} title="Quick Capture (Ctrl+Q)">
            {quickLabel}
          </button>
          <button className="btn btn-sm" style={{ background: JOURNAL_COLOR, color: '#000', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: '1px solid rgba(0,0,0,.2)', paddingInline: 8 }} onClick={() => setMenuOpen(o => !o)} aria-label="Quick capture options">
            ▾
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, overflow: 'hidden', zIndex: 20, minWidth: 160 }}>
              <button onClick={() => selectMode('longform')} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.77em', background: quickMode === 'longform' ? 'rgba(56,176,0,.15)' : 'none', border: 'none', color: 'var(--tx)', cursor: 'pointer' }}>📝 Long-form note</button>
              <button onClick={() => selectMode('sticky')} style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.77em', background: quickMode === 'sticky' ? 'rgba(56,176,0,.15)' : 'none', border: 'none', color: 'var(--tx)', cursor: 'pointer' }}>📌 Sticky</button>
            </div>
          )}
        </div>
        <span style={{ fontSize: '0.62em', color: 'var(--mut)', marginLeft: 'auto' }}>
          Ctrl+Q
        </span>
      </div>
    </div>
  )
}

function IdeasPanel({ ideas, setIdeas }) {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState({ names: '', words: '', phrases: '' })

  useEffect(() => { lsSet(IDEAS_LS_KEY, ideas) }, [ideas])

  useEffect(() => {
    let ignore = false
    async function loadIdeas() {
      if (!hasSupabase || !supabase) return
      try {
        const { data, error } = await supabase.from('ideas_list').select('id, category, value, created_at').order('created_at', { ascending: false })
        if (error || !data) return
        if (!ignore) setIdeas(data)
      } catch {}
    }
    loadIdeas()
    return () => { ignore = true }
  }, [setIdeas])

  async function addIdea(category) {
    const value = (drafts[category] || '').trim()
    if (!value) return
    const idea = { id: uid(), category, value, created_at: new Date().toISOString() }
    setIdeas(prev => [idea, ...prev])
    setDrafts(prev => ({ ...prev, [category]: '' }))
    if (!hasSupabase || !supabase) return
    try {
      await supabase.from('ideas_list').insert(idea)
    } catch {}
  }

  async function removeIdea(id) {
    setIdeas(prev => prev.filter(i => i.id !== id))
    if (!hasSupabase || !supabase) return
    try {
      await supabase.from('ideas_list').delete().eq('id', id)
    } catch {}
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: 10, marginBottom: 12 }}>
      <button className="btn btn-sm btn-outline" onClick={() => setOpen(o => !o)} style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
        <span>💡 Ideas</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {IDEAS_CATEGORIES.map(cat => {
            const catIdeas = ideas.filter(i => i.category === cat.id)
            return (
              <div key={cat.id}>
                <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 4 }}>{cat.label}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    className="sx"
                    placeholder={`Add ${cat.label.toLowerCase()}…`}
                    value={drafts[cat.id]}
                    onChange={e => setDrafts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addIdea(cat.id) }}
                    style={{ fontSize: '0.77em' }}
                  />
                  <button className="btn btn-sm" style={{ background: JOURNAL_COLOR, color: '#000' }} onClick={() => addIdea(cat.id)}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {catIdeas.map(idea => (
                    <span key={idea.id} style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 999, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      {idea.value}
                      <button onClick={() => removeIdea(idea.id)} style={{ border: 'none', background: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.85em', padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LongFormNoteModal({ open, draft, setDraft, onClose, onSave }) {
  if (!open) return null
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title" style={{ color: JOURNAL_COLOR }}>📝 New Long-form Note</div>
        <div className="field">
          <label>Title (optional)</label>
          <input value={draft.title} onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="Note title…" />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={draft.category} onChange={e => setDraft(prev => ({ ...prev, category: e.target.value }))}>
            <option value="General">General</option>
            <option value="Canon">Canon</option>
            <option value="Brainstorm">Brainstorm</option>
            <option value="Research">Research</option>
            <option value="Todo">Todo</option>
            <option value="Quote">Quote</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Content</label>
          <textarea value={draft.content} onChange={e => setDraft(prev => ({ ...prev, content: e.target.value }))} placeholder="Write your long-form note…" style={{ minHeight: 160 }} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: JOURNAL_COLOR, color: '#000' }} onClick={onSave}>Save Note</button>
        </div>
      </div>
    </div>
  )
}

// ── StickyBoard ──────────────────────────────────────────────────
function StickyBoard({ captures, tags, onDelete, onEdit, onReorder }) {
  const [sortMode, setSortMode] = useState('manual')
  const [searchQ, setSearchQ] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [filterColor, setFilterColor] = useState('all')
  const [todayOnly, setTodayOnly] = useState(false)
  const [editId, setEditId] = useState(null)
  const [controlsOpen, setControlsOpen] = useState(new Set()) // cards with controls expanded
  function toggleControls(id) {
    setControlsOpen(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const [editText, setEditText] = useState('')
  const [dragSource, setDragSource] = useState(null)
  const [presetName, setPresetName] = useState('')
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [presets, setPresets] = useState(() => lsGet('journal_presets', []))

  const today = new Date().toDateString()

  const filtered = [...captures]
    .filter(c => {
      if (searchQ && !c.text?.toLowerCase().includes(searchQ.toLowerCase())) return false
      if (filterTag !== 'all' && c.tag !== filterTag) return false
      if (filterColor !== 'all' && c.color !== filterColor) return false
      if (todayOnly && new Date(c.created).toDateString() !== today) return false
      return true
    })
    .sort((a, b) => {
      if (sortMode === 'manual') return 0
      if (sortMode === 'newest') return new Date(b.created) - new Date(a.created)
      if (sortMode === 'oldest') return new Date(a.created) - new Date(b.created)
      if (sortMode === 'alpha') return (a.text||'').localeCompare(b.text||'')
      if (sortMode === 'pinned') return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
      if (sortMode === 'tag') return (a.tag||'').localeCompare(b.tag||'')
      return 0
    })

  // Sort: pinned always first in manual mode
  const displayed = sortMode === 'manual'
    ? [...filtered.filter(c => c.pinned), ...filtered.filter(c => !c.pinned)]
    : filtered

  function handleDragStart(c) { setDragSource(c) }
  function handleDrop(target) {
    if (!dragSource || dragSource.id === target.id || sortMode !== 'manual') return
    const ids = captures.map(c => c.id)
    const from = ids.indexOf(dragSource.id)
    const to = ids.indexOf(target.id)
    if (from < 0 || to < 0) return
    const next = [...captures]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
    setDragSource(null)
  }

  function startEdit(c) { setEditId(c.id); setEditText(c.text || '') }
  function saveEdit(c) {
    if (editText.trim()) onEdit({ ...c, text: editText.trim() })
    setEditId(null)
  }

  function savePreset() {
    if (!presetName.trim()) return
    const preset = { name: presetName.trim(), sortMode, filterTag, filterColor, todayOnly }
    const updated = [...presets, preset]
    setPresets(updated); lsSet('journal_presets', updated)
    setPresetName(''); setShowPresetInput(false)
  }

  function applyPreset(p) {
    setSortMode(p.sortMode); setFilterTag(p.filterTag)
    setFilterColor(p.filterColor); setTodayOnly(p.todayOnly)
  }

  function deletePreset(i) {
    const updated = presets.filter((_, pi) => pi !== i)
    setPresets(updated); lsSet('journal_presets', updated)
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <input className="sx" placeholder="Search stickies…" value={searchQ}
          onChange={e => setSearchQ(e.target.value)} style={{ flex: 1, minWidth: 140 }} />

        <select value={sortMode} onChange={e => setSortMode(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="manual">Manual order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="alpha">A → Z</option>
          <option value="pinned">Pinned first</option>
          <option value="tag">By tag</option>
        </select>

        <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All tags</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 6px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All colors</option>
          {STICKY_COLORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <button className={`btn btn-sm btn-outline`} style={todayOnly ? { color: JOURNAL_COLOR, borderColor: JOURNAL_COLOR } : {}}
          onClick={() => setTodayOnly(t => !t)}>Today</button>
      </div>

      {/* Presets */}
      {(presets.length > 0 || showPresetInput) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {presets.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => applyPreset(p)}
                style={{ fontSize: '0.62em', padding: '2px 8px', borderRadius: 10, border: `1px solid ${JOURNAL_COLOR}`, background: 'none', color: JOURNAL_COLOR, cursor: 'pointer' }}>{p.name}</button>
              <button onClick={() => deletePreset(i)}
                style={{ fontSize: '0.62em', background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>
          {displayed.length} of {captures.length} stickies
          {sortMode === 'manual' && ' · drag to reorder'}
        </div>
        {!showPresetInput
          ? <button onClick={() => setShowPresetInput(true)} style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>+ Save view</button>
          : <div style={{ display: 'flex', gap: 4 }}>
              <input value={presetName} onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePreset()}
                placeholder="Preset name…" autoFocus
                style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', width: 100 }} />
              <button onClick={savePreset} style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 6, border: 'none', background: JOURNAL_COLOR, color: '#000', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setShowPresetInput(false)} style={{ fontSize: '0.62em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>✕</button>
            </div>
        }
      </div>

      {/* Empty */}
      {!displayed.length && (
        <div className="empty">
          <div className="empty-icon">📌</div>
          <p>{captures.length > 0 ? 'No stickies match your filter.' : 'No stickies yet. Use Quick Capture to add your first!'}</p>
        </div>
      )}

      {/* Sticky grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        {displayed.map(c => {
          const sc = STICKY_COLORS.find(x => x.id === c.color) || STICKY_COLORS[0]
          const tag = tags.find(t => t.id === c.tag) || DEFAULT_TAGS[DEFAULT_TAGS.length - 1]
          const tilt = stickyTilt(c.id)
          const isEditing = editId === c.id
          const size = c.size || 'normal'
          const width = size === 'small' ? 140 : size === 'large' ? 260 : size === 'xl' ? 340 : 190
          // Use custom colors if set, otherwise use preset
          const bgColor = c.customBg || sc.bg
          const textColor = c.customText || sc.text
          const fontSize = c.fontSize || '0.92em'

          return (
            <div
              key={c.id}
              draggable={sortMode === 'manual'}
              onDragStart={() => handleDragStart(c)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(c)}
              style={{
                width,
                minHeight: size === 'small' ? 100 : size === 'large' ? 180 : size === 'xl' ? 240 : 140,
                background: bgColor,
                border: `1px solid ${c.customBorder || sc.border}`,
                borderRadius: 4,
                boxShadow: '2px 3px 8px rgba(0,0,0,.15)',
                padding: size === 'small' ? 8 : 12,
                transform: `rotate(${tilt}deg)`,
                transition: 'transform .15s, box-shadow .15s',
                position: 'relative',
                cursor: sortMode === 'manual' ? 'grab' : 'default',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)'; e.currentTarget.style.boxShadow = '4px 6px 16px rgba(0,0,0,.22)'; e.currentTarget.style.zIndex = 10 }}
              onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${tilt}deg)`; e.currentTarget.style.boxShadow = '2px 3px 8px rgba(0,0,0,.15)'; e.currentTarget.style.zIndex = 1 }}
            >
              {/* Tag corner fold */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 18px 18px 0', borderColor: `transparent ${tag.color}55 transparent transparent` }} title={tag.label} />

              {/* Pin indicator */}
              {c.pinned && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.92em' }}>📌</div>}

              {isEditing ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    style={{ width: '100%', minHeight: 60, background: 'rgba(255,255,255,.6)', border: '1px solid rgba(0,0,0,.2)', borderRadius: 3, padding: '4px 6px', fontSize, color: textColor, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => saveEdit(c)} style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 4, border: 'none', background: sc.border, color: '#fff', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditId(null)} style={{ fontSize: '0.62em', padding: '2px 6px', borderRadius: 4, border: `1px solid ${sc.border}`, background: 'none', color: textColor, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize, color: textColor, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.text}
                  </div>
                  <div style={{ fontSize: '0.62em', color: textColor, opacity: 0.6, marginTop: 6 }}>
                    {c.created ? new Date(c.created).toLocaleString() : ''}
                  </div>

                  {/* Compact action row — always visible */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                    <button onClick={() => { toggleControls(c.id); if (editId === c.id) setEditId(null) }}
                      title={controlsOpen.has(c.id) ? 'Hide controls' : 'Edit / style'}
                      style={{ fontSize: '0.62em', padding: '1px 6px', borderRadius: 4,
                        border: `1px solid ${sc.border}`,
                        background: controlsOpen.has(c.id) ? sc.border : 'none',
                        color: controlsOpen.has(c.id) ? '#fff' : textColor, cursor: 'pointer' }}>✎</button>
                    <button onClick={() => onEdit({ ...c, pinned: !c.pinned })} title={c.pinned ? 'Unpin' : 'Pin'}
                      style={{ fontSize: '0.62em', padding: '1px 6px', borderRadius: 4, border: `1px solid ${sc.border}`, background: c.pinned ? sc.border : 'none', color: c.pinned ? '#fff' : textColor, cursor: 'pointer' }}>📌</button>
                    <button onClick={() => onDelete(c.id)} title="Delete"
                      style={{ fontSize: '0.62em', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,0,0,.3)', background: 'none', color: '#cc0000', cursor: 'pointer' }}>✕</button>
                  </div>

                  {/* Expanded controls — shown when ✎ is active */}
                  {controlsOpen.has(c.id) && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', alignItems: 'center',
                      padding: '6px', background: 'rgba(0,0,0,.08)', borderRadius: 4 }}>
                      <select value={c.color || 'yellow'} onChange={e => onEdit({ ...c, color: e.target.value })}
                        title="Preset color"
                        style={{ fontSize: '0.62em', padding: '1px 3px', background: 'rgba(255,255,255,.5)', border: `1px solid ${sc.border}`, borderRadius: 4, color: textColor, maxWidth: 80 }}>
                        {STICKY_COLORS.map(sc2 => <option key={sc2.id} value={sc2.id}>{sc2.label}</option>)}
                      </select>
                      <input type="color" value={c.customBg || sc.bg} title="Custom background"
                        onChange={e => onEdit({ ...c, customBg: e.target.value })}
                        style={{ width: 18, height: 18, padding: 0, border: 'none', borderRadius: 3, cursor: 'pointer' }} />
                      <input type="color" value={c.customText || sc.text} title="Custom text color"
                        onChange={e => onEdit({ ...c, customText: e.target.value })}
                        style={{ width: 18, height: 18, padding: 0, border: 'none', borderRadius: 3, cursor: 'pointer' }} />
                      <select value={c.fontSize || '0.92em'} onChange={e => onEdit({ ...c, fontSize: e.target.value })}
                        title="Font size"
                        style={{ fontSize: '0.62em', padding: '1px 3px', background: 'rgba(255,255,255,.5)', border: `1px solid ${sc.border}`, borderRadius: 4, color: textColor, maxWidth: 52 }}>
                        <option value="0.69em">XS</option>
                        <option value="0.77em">S</option>
                        <option value="0.92em">M</option>
                        <option value="1.08em">L</option>
                        <option value="1.23em">XL</option>
                      </select>
                      <select value={c.size || 'normal'} onChange={e => onEdit({ ...c, size: e.target.value })}
                        title="Card size"
                        style={{ fontSize: '0.62em', padding: '1px 3px', background: 'rgba(255,255,255,.5)', border: `1px solid ${sc.border}`, borderRadius: 4, color: textColor, maxWidth: 60 }}>
                        <option value="small">Small</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                        <option value="xl">XL</option>
                      </select>
                      <select value={c.tag || 'unsorted'} onChange={e => onEdit({ ...c, tag: e.target.value })}
                        title="Tag"
                        style={{ fontSize: '0.62em', padding: '1px 3px', background: 'rgba(255,255,255,.5)', border: `1px solid ${sc.border}`, borderRadius: 4, color: textColor, flex: 1, minWidth: 60 }}>
                        {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                      <button onClick={() => startEdit(c)} title="Edit text"
                        style={{ fontSize: '0.62em', padding: '1px 6px', borderRadius: 4, border: `1px solid ${sc.border}`, background: 'none', color: textColor, cursor: 'pointer' }}>✎ text</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TagManager ───────────────────────────────────────────────────
function TagManager({ tags, onUpdate, onClose }) {
  const [localTags, setLocalTags] = useState(tags)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#cc66ff')

  function addTag() {
    if (!newLabel.trim()) return
    const t = { id: uid(), label: newLabel.trim(), color: newColor }
    setLocalTags(prev => [...prev, t])
    setNewLabel('')
  }

  function updateTag(id, field, val) {
    setLocalTags(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t))
  }

  function removeTag(id) {
    if (id === 'unsorted') return
    setLocalTags(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div>
      {localTags.map(t => (
        <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input type="color" value={t.color} onChange={e => updateTag(t.id, 'color', e.target.value)}
            style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
          <input value={t.label} onChange={e => updateTag(t.id, 'label', e.target.value)}
            style={{ flex: 1, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontSize: '0.85em' }} />
          {t.id !== 'unsorted' && (
            <button onClick={() => removeTag(t.id)}
              style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', fontSize: '1em', padding: '0 2px' }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
          style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="New tag name…"
          onKeyDown={e => e.key === 'Enter' && addTag()}
          style={{ flex: 1, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontSize: '0.85em' }} />
        <button className="btn btn-sm" style={{ background: JOURNAL_COLOR, color: '#000' }} onClick={addTag}>+ Add</button>
      </div>
      <div className="modal-actions" style={{ marginTop: 14 }}>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ background: JOURNAL_COLOR, color: '#000' }}
          onClick={() => { onUpdate(localTags); onClose() }}>Save Tags</button>
      </div>
    </div>
  )
}

// ── Main Journal component ───────────────────────────────────────
export default function Journal({ db, navSearch }) {
  const [tags, setTags] = useState(() => lsGet('gcomp_journal_tags', DEFAULT_TAGS))
  const [captures, setCaptures] = useState(() => lsGet('gcomp_captures', []))
  const [showTagManager, setShowTagManager] = useState(false)
  const [mobileZone, setMobileZone] = useState('capture') // 'capture' | 'stickies'
  const [ideas, setIdeas] = useState(() => lsGet(IDEAS_LS_KEY, []))
  const [longFormOpen, setLongFormOpen] = useState(false)
  const [longFormDraft, setLongFormDraft] = useState({ title: '', category: 'Brainstorm', content: '' })

  // Persist tags and captures to localStorage (Supabase migration: future build)
  function saveTags(t) { setTags(t); lsSet('gcomp_journal_tags', t) }
  function saveCaptures(c) { setCaptures(c); lsSet('gcomp_captures', c) }

  // Also sync from db journal_captures if available
  useEffect(() => {
    const dbCaptures = db.db.journal_captures || []
    if (dbCaptures.length > 0) {
      // Merge db captures with local (db wins on conflict by id)
      const localIds = new Set(captures.map(c => c.id))
      const newFromDb = dbCaptures.filter(c => !localIds.has(c.id))
      if (newFromDb.length > 0) {
        const merged = [...captures, ...newFromDb].sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
        setCaptures(merged)
        lsSet('gcomp_captures', merged)
      }
    }
  }, [db.db.journal_captures])

  function addCapture(item) {
    const entry = { id: uid(), ...item, created: new Date().toISOString() }
    const updated = [entry, ...captures]
    saveCaptures(updated)
    // Also write to db for cross-device sync
    db.upsertEntry('journal_captures', entry)
  }

  function openLongForm(prefill = '') {
    setLongFormDraft({ title: '', category: 'Brainstorm', content: prefill })
    setLongFormOpen(true)
  }

  function saveLongForm() {
    if (!longFormDraft.content.trim()) return
    db.upsertEntry('notes', {
      id: uid(),
      title: longFormDraft.title?.trim() || '',
      category: longFormDraft.category || 'Brainstorm',
      content: longFormDraft.content.trim(),
      updated: new Date().toISOString(),
    })
    setLongFormOpen(false)
    setLongFormDraft({ title: '', category: 'Brainstorm', content: '' })
  }

  function deleteCapture(id) {
    saveCaptures(captures.filter(c => c.id !== id))
    db.deleteEntry('journal_captures', id)
  }

  function editCapture(updated) {
    saveCaptures(captures.map(c => c.id === updated.id ? updated : c))
    db.upsertEntry('journal_captures', updated)
  }

  function reorderCaptures(newOrder) {
    saveCaptures(newOrder)
  }

  const isMobile = window.innerWidth < 700

  return (
    <div>
      {/* Header */}
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', color: JOURNAL_COLOR }}>📝 Notes</div>
        {isMobile && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" style={{ background: mobileZone === 'capture' ? JOURNAL_COLOR : 'none', color: mobileZone === 'capture' ? '#000' : 'var(--dim)', border: `1px solid ${JOURNAL_COLOR}` }} onClick={() => setMobileZone('capture')}>Capture</button>
            <button className="btn btn-sm" style={{ background: mobileZone === 'stickies' ? JOURNAL_COLOR : 'none', color: mobileZone === 'stickies' ? '#000' : 'var(--dim)', border: `1px solid ${JOURNAL_COLOR}` }} onClick={() => setMobileZone('stickies')}>Stickies</button>
          </div>
        )}
        <button className="btn btn-sm btn-outline" onClick={() => setShowTagManager(true)}>🏷 Tags</button>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{captures.length} stickies</span>
      </div>

      {/* Two-column layout (desktop) / single zone (mobile) */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Left: Quick Capture */}
        {(!isMobile || mobileZone === 'capture') && (
          <div style={{ width: isMobile ? '100%' : 260, flexShrink: 0 }}>
            <QuickCapture tags={tags} onAddSticky={addCapture} onOpenLongForm={openLongForm} />
            <IdeasPanel ideas={ideas} setIdeas={setIdeas} />
            {/* Recent captures mini list */}
            <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginBottom: 6 }}>Recent captures</div>
            {captures.slice(0, 8).map(c => {
              const sc = STICKY_COLORS.find(x => x.id === c.color) || STICKY_COLORS[0]
              const tag = tags.find(t => t.id === c.tag)
              return (
                <div key={c.id} style={{ padding: '5px 8px', marginBottom: 4, background: sc.bg + 'cc', border: `1px solid ${sc.border}44`, borderRadius: 6, fontSize: '0.77em', color: sc.text, position: 'relative' }}>
                  <div style={{ paddingRight: 16, lineHeight: 1.4 }}>{c.text?.slice(0, 80)}{(c.text?.length||0) > 80 ? '…' : ''}</div>
                  {tag && <div style={{ fontSize: '0.69em', color: tag.color, marginTop: 2 }}>{tag.label}</div>}
                  <button onClick={() => deleteCapture(c.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: sc.border, cursor: 'pointer', fontSize: '0.85em', padding: 0 }}>✕</button>
                </div>
              )
            })}
            {captures.length > 8 && (
              <div style={{ fontSize: '0.69em', color: 'var(--mut)', textAlign: 'center', marginTop: 4 }}>
                +{captures.length - 8} more — view in Stickies →
              </div>
            )}
          </div>
        )}

        {/* Right: Sticky board */}
        {(!isMobile || mobileZone === 'stickies') && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <StickyBoard
              captures={captures}
              tags={tags}
              onDelete={deleteCapture}
              onEdit={editCapture}
              onReorder={reorderCaptures}
            />
          </div>
        )}
      </div>

      {/* Tag Manager modal */}
      {showTagManager && (
        <div className="modal-overlay open" onClick={() => setShowTagManager(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={() => setShowTagManager(false)}>✕</button>
            <div className="modal-title" style={{ color: JOURNAL_COLOR }}>🏷 Manage Tags</div>
            <TagManager tags={tags} onUpdate={saveTags} onClose={() => setShowTagManager(false)} />
          </div>
        </div>
      )}
      <LongFormNoteModal
        open={longFormOpen}
        draft={longFormDraft}
        setDraft={setLongFormDraft}
        onClose={() => setLongFormOpen(false)}
        onSave={saveLongForm}
      />
    </div>
  )
}
