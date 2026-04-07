import { useState, useEffect, useRef, useCallback } from 'react'
import { uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Pastel sticky colors ──────────────────────────────────────────
const STICKY_COLORS = [
  { id: 'pink',   bg: '#FFE4EE', border: '#FFB3CC', text: '#7A2040' },
  { id: 'peach',  bg: '#FFE8D6', border: '#FFB997', text: '#7A3010' },
  { id: 'yellow', bg: '#FFFACC', border: '#FFE566', text: '#5A4A00' },
  { id: 'mint',   bg: '#DCFCE7', border: '#86EFAC', text: '#14532D' },
  { id: 'sky',    bg: '#DBEAFE', border: '#93C5FD', text: '#1E3A5F' },
  { id: 'lavender',bg:'#EDE9FE', border: '#C4B5FD', text: '#3B1F6A' },
  { id: 'rose',   bg: '#FFE4E6', border: '#FDA4AF', text: '#6B1020' },
  { id: 'teal',   bg: '#CCFBF1', border: '#5EEAD4', text: '#134E4A' },
]

const DEFAULT_TAGS = [
  { id: 'name-person', label: 'Name — Person',  color: '#c966ff' },
  { id: 'name-place',  label: 'Name — Place',   color: '#3388ff' },
  { id: 'name-thing',  label: 'Name — Thing',   color: '#00ccaa' },
  { id: 'magic',       label: 'Magic',           color: '#ff44aa' },
  { id: 'lore',        label: 'Lore',            color: '#ffaa33' },
  { id: 'history',     label: 'History',         color: '#cc6644' },
  { id: 'language',    label: 'Language',        color: '#00e5cc' },
  { id: 'plot-idea',   label: 'Plot Idea',       color: '#ff3355' },
  { id: 'vibe',        label: 'Vibe / Mood',     color: '#9933ff' },
  { id: 'unsorted',    label: 'Unsorted',        color: '#666688' },
]

function fmtDT(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return '' }
}

// Pseudo-random tilt from id, -3 to +3 degrees
function stickyTilt(id) {
  let h = 0
  for (let i = 0; i < (id||'').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return ((h % 7) - 3)
}

// ── Tag pill ──────────────────────────────────────────────────────
function TagPill({ tag, active, onClick, size = 'normal' }) {
  const sm = size === 'small'
  return (
    <button onClick={onClick} style={{
      padding: sm ? '1px 7px' : '2px 10px', borderRadius: 12,
      border: `1px solid ${tag.color}66`,
      background: active ? `${tag.color}22` : 'none',
      color: active ? tag.color : 'var(--dim)',
      fontSize: sm ? 9 : 10, cursor: 'pointer', transition: '.15s', whiteSpace: 'nowrap',
    }}>{tag.label}</button>
  )
}

// ── Quick Capture ────────────────────────────────────────────────
function QuickCapture({ tags, onAdd }) {
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [selectedTag, setSelectedTag] = useState('unsorted')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef()

  function submit() {
    if (!text.trim()) return
    const now = new Date().toISOString()
    onAdd({ id: uid(), text: text.trim(), note: note.trim(), tag: selectedTag, created: now, updated: now })
    setText(''); setNote(''); setSelectedTag('unsorted'); setExpanded(false)
    inputRef.current?.focus()
  }

  const tag = tags.find(t => t.id === selectedTag) || tags[tags.length - 1]
  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${tag.color}44`, borderRadius: 'var(--rl)', padding: 14, marginBottom: 14, transition: 'border-color .2s' }}>
      <div style={{ fontSize: '0.85em', color: tag.color, fontFamily: "'Cinzel',serif", marginBottom: 10, fontWeight: 700 }}>⚡ Quick Capture</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input ref={inputRef} value={text}
          onChange={e => { setText(e.target.value); if (!expanded && e.target.value) setExpanded(true) }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          onFocus={() => setExpanded(true)}
          placeholder="Word, name, idea… press Enter to save"
          style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r)', border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.92em', outline: 'none' }} />
        <button onClick={submit}
          style={{ padding: '7px 14px', borderRadius: 'var(--r)', border: 'none', background: tag.color, color: '#000', fontSize: '0.85em', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Save</button>
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '0.69em', color: 'var(--dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tag</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {tags.map(t => <TagPill key={t.id} tag={t} active={selectedTag === t.id} onClick={() => setSelectedTag(t.id)} />)}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Note (optional)…"
            style={{ width: '100%', padding: '6px 9px', borderRadius: 'var(--r)', border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }} />
        </div>
      )}
    </div>
  )
}

// ── Sticky Board ─────────────────────────────────────────────────
function StickyBoard({ captures, tags, onDelete, onEdit, onReorder }) {
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState(() => {
    try { return localStorage.getItem('gcomp_sticky_sort') || 'newest' } catch { return 'newest' }
  })
  const [filterTag, setFilterTag] = useState('all')
  const [filterColor, setFilterColor] = useState('all')
  const [showPinnedFirst, setShowPinnedFirst] = useState(true)
  const [showToday, setShowToday] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [savedPresets, setSavedPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gcomp_sticky_presets') || '[]') } catch { return [] }
  })
  const [presetName, setPresetName] = useState('')
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editTag, setEditTag] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editSize, setEditSize] = useState('normal')
  const [editPinned, setEditPinned] = useState(false)
  const dragSrc = useRef(null)

  function saveSortMode(m) {
    setSortMode(m)
    try { localStorage.setItem('gcomp_sticky_sort', m) } catch {}
  }

  const today = new Date().toDateString()

  const filtered = captures.filter(c => {
    if (filterTag !== 'all' && c.tag !== filterTag) return false
    if (filterColor !== 'all' && c.color !== filterColor) return false
    if (search && !c.text.toLowerCase().includes(search.toLowerCase()) && !(c.note||'').toLowerCase().includes(search.toLowerCase())) return false
    if (showToday && new Date(c.created).toDateString() !== today) return false
    if (dateFrom && new Date(c.created) < new Date(dateFrom)) return false
    if (dateTo && new Date(c.created) > new Date(dateTo + 'T23:59:59')) return false
    return true
  }).sort((a, b) => {
    if (showPinnedFirst) {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
    }
    if (sortMode === 'newest') return new Date(b.created) - new Date(a.created)
    if (sortMode === 'oldest') return new Date(a.created) - new Date(b.created)
    if (sortMode === 'alpha') return (a.text||'').localeCompare(b.text||'')
    if (sortMode === 'tag') return (a.tag||'').localeCompare(b.tag||'')
    if (sortMode === 'color') return (a.color||'').localeCompare(b.color||'')
    if (sortMode === 'manual') return (a.manual_order||0) - (b.manual_order||0)
    return 0
  })

  function savePreset() {
    if (!presetName.trim()) return
    const preset = { id: uid(), name: presetName.trim(), search, filterTag, filterColor, sortMode, showPinnedFirst, showToday, dateFrom, dateTo }
    const next = [...savedPresets, preset]
    setSavedPresets(next)
    try { localStorage.setItem('gcomp_sticky_presets', JSON.stringify(next)) } catch {}
    setPresetName(''); setShowPresetInput(false)
  }

  function loadPreset(p) {
    setSearch(p.search || '')
    setFilterTag(p.filterTag || 'all')
    setFilterColor(p.filterColor || 'all')
    saveSortMode(p.sortMode || 'newest')
    setShowPinnedFirst(p.showPinnedFirst !== false)
    setShowToday(p.showToday || false)
    setDateFrom(p.dateFrom || '')
    setDateTo(p.dateTo || '')
  }

  function deletePreset(id) {
    const next = savedPresets.filter(p => p.id !== id)
    setSavedPresets(next)
    try { localStorage.setItem('gcomp_sticky_presets', JSON.stringify(next)) } catch {}
  }

  function startEdit(c) {
    setEditId(c.id); setEditText(c.text); setEditNote(c.note||'')
    setEditTag(c.tag||'unsorted'); setEditColor(c.color||''); setEditSize(c.size||'normal'); setEditPinned(c.pinned||false)
  }

  function saveEdit(c) {
    onEdit({ ...c, text: editText, note: editNote, tag: editTag, color: editColor, size: editSize, pinned: editPinned, updated: new Date().toISOString() })
    setEditId(null)
  }

  function togglePin(c) { onEdit({ ...c, pinned: !c.pinned, updated: new Date().toISOString() }) }
  function changeColor(c, colorId) { onEdit({ ...c, color: colorId, updated: new Date().toISOString() }) }
  function changeSize(c, size) { onEdit({ ...c, size, updated: new Date().toISOString() }) }

  // Drag reorder for manual mode
  function handleDragStart(c) { dragSrc.current = c.id }
  function handleDrop(c) {
    if (!dragSrc.current || dragSrc.current === c.id) return
    const order = filtered.map(x => x.id)
    const fromIdx = order.indexOf(dragSrc.current)
    const toIdx = order.indexOf(c.id)
    const reordered = [...filtered]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    reordered.forEach((x, i) => onEdit({ ...x, manual_order: i }))
    dragSrc.current = null
    if (sortMode !== 'manual') saveSortMode('manual')
  }

  const tagCounts = {}
  captures.forEach(c => { tagCounts[c.tag] = (tagCounts[c.tag]||0) + 1 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search stickies…"
          style={{ flex: 1, minWidth: 120, padding: '5px 9px', borderRadius: 8, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }} />
        <select value={sortMode} onChange={e => saveSortMode(e.target.value)}
          style={{ fontSize: '0.77em', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)', cursor: 'pointer' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alpha">A → Z</option>
          <option value="tag">By Tag</option>
          <option value="color">By Color</option>
          <option value="manual">Manual Order</option>
        </select>
        <button onClick={() => setShowPinnedFirst(v => !v)}
          style={{ fontSize: '0.69em', padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
            background: showPinnedFirst ? 'var(--cc)' : 'none', color: showPinnedFirst ? '#000' : 'var(--dim)',
            border: `1px solid ${showPinnedFirst ? 'var(--cc)' : 'var(--brd)'}` }}>📌 Pinned first</button>
        <button onClick={() => setShowToday(v => !v)}
          style={{ fontSize: '0.69em', padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
            background: showToday ? 'var(--ct)' : 'none', color: showToday ? '#000' : 'var(--dim)',
            border: `1px solid ${showToday ? 'var(--ct)' : 'var(--brd)'}` }}>Today</button>
      </div>

      {/* Tag filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        <button className={`fp ${filterTag==='all'?'active':''}`} onClick={() => setFilterTag('all')}>All ({captures.length})</button>
        {tags.map(t => {
          const cnt = tagCounts[t.id] || 0
          if (!cnt) return null
          return <button key={t.id} className={`fp ${filterTag===t.id?'active':''}`}
            style={{ color: t.color }} onClick={() => setFilterTag(filterTag===t.id?'all':t.id)}>{t.label} ({cnt})</button>
        })}
      </div>

      {/* Color filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        <button className={`fp ${filterColor==='all'?'active':''}`} onClick={() => setFilterColor('all')} style={{ fontSize:'0.62em' }}>All Colors</button>
        {STICKY_COLORS.map(sc => (
          <button key={sc.id} onClick={() => setFilterColor(filterColor===sc.id?'all':sc.id)}
            style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${filterColor===sc.id?sc.border:'transparent'}`, background:sc.bg, cursor:'pointer', padding:0, flexShrink:0 }} title={sc.id} />
        ))}
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>Date range:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)' }} />
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)' }} />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            style={{ fontSize: '0.62em', padding: '1px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>✕ Clear</button>
        )}
      </div>

      {/* Saved presets */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.62em', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Presets:</span>
        {savedPresets.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <button onClick={() => loadPreset(p)}
              style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--card)', color: 'var(--dim)', cursor: 'pointer' }}>{p.name}</button>
            <button onClick={() => deletePreset(p.id)}
              style={{ fontSize: '0.54em', padding: '1px 3px', background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        {showPresetInput ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={presetName} onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && savePreset()}
              placeholder="Preset name…" autoFocus
              style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', width: 100 }} />
            <button onClick={savePreset} style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 6, border: 'none', background: 'var(--cc)', color: '#000', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setShowPresetInput(false)} style={{ fontSize: '0.62em', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowPresetInput(true)}
            style={{ fontSize: '0.62em', padding: '2px 7px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>+ Save current view</button>
        )}
      </div>

      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginBottom: 8 }}>
        {filtered.length} of {captures.length} stickies
        {sortMode === 'manual' && ' · drag to reorder'}
      </div>

      {/* Sticky grid */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mut)', fontSize: '0.92em' }}>
          No stickies match this filter.
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
        {filtered.map(c => {
          const stickyCol = STICKY_COLORS.find(sc => sc.id === c.color) || STICKY_COLORS[0]
          const tag = tags.find(t => t.id === c.tag) || DEFAULT_TAGS[DEFAULT_TAGS.length - 1]
          const tilt = stickyTilt(c.id)
          const isEditing = editId === c.id
          const size = c.size || 'normal'
          const width = size === 'small' ? 140 : size === 'large' ? 260 : 190

          return (
            <div key={c.id}
              draggable={sortMode === 'manual'}
              onDragStart={() => handleDragStart(c)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(c)}
              style={{
                width, minHeight: size === 'small' ? 100 : size === 'large' ? 180 : 140,
                background: stickyCol.bg,
                border: `1px solid ${stickyCol.border}`,
                borderRadius: 4,
                boxShadow: `2px 3px 8px rgba(0,0,0,.15)`,
                padding: size === 'small' ? 8 : 12,
                transform: `rotate(${tilt}deg)`,
                transition: 'transform .15s, box-shadow .15s',
                position: 'relative',
                cursor: sortMode === 'manual' ? 'grab' : 'default',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)'; e.currentTarget.style.boxShadow = '4px 6px 16px rgba(0,0,0,.22)'; e.currentTarget.style.zIndex = 10 }}
              onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${tilt}deg)`; e.currentTarget.style.boxShadow = '2px 3px 8px rgba(0,0,0,.15)'; e.currentTarget.style.zIndex = 1 }}
            >
              {/* Tag corner fold */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 0, height: 0,
                borderStyle: 'solid',
                borderWidth: `0 20px 20px 0`,
                borderColor: `transparent ${tag.color}44 transparent transparent`,
              }} title={tag.label} />

              {/* Pin indicator */}
              {c.pinned && (
                <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: '1em' }}>📌</div>
              )}

              {isEditing ? (
                <div>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 60, padding: 4, border: `1px solid ${stickyCol.border}`, borderRadius: 4, background: 'rgba(255,255,255,.5)', fontSize: '0.85em', color: stickyCol.text, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} autoFocus />
                  <input value={editNote} onChange={e => setEditNote(e.target.value)}
                    placeholder="Note…"
                    style={{ width: '100%', marginTop: 4, padding: '3px 5px', border: `1px solid ${stickyCol.border}`, borderRadius: 4, background: 'rgba(255,255,255,.5)', fontSize: '0.72em', color: stickyCol.text, outline: 'none' }} />
                  {/* Tag picker */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {tags.map(t => <TagPill key={t.id} tag={t} active={editTag===t.id} onClick={() => setEditTag(t.id)} size="small" />)}
                  </div>
                  {/* Color picker */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {STICKY_COLORS.map(sc => (
                      <button key={sc.id} onClick={() => setEditColor(sc.id)}
                        style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${editColor===sc.id?sc.border:'transparent'}`, background: sc.bg, cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  {/* Size picker */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {['small','normal','large'].map(sz => (
                      <button key={sz} onClick={() => setEditSize(sz)}
                        style={{ fontSize: '0.54em', padding: '1px 5px', borderRadius: 4, border: `1px solid ${editSize===sz?stickyCol.border:'var(--brd)'}`, background: editSize===sz?stickyCol.border:'none', color: editSize===sz?'#fff':stickyCol.text, cursor: 'pointer' }}>{sz}</button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62em', color: stickyCol.text, marginTop: 4 }}>
                    <input type="checkbox" checked={editPinned} onChange={e => setEditPinned(e.target.checked)} /> Pin
                  </label>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditId(null)} style={{ fontSize: '0.62em', padding: '2px 6px', borderRadius: 4, border: `1px solid ${stickyCol.border}`, background: 'none', color: stickyCol.text, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => saveEdit(c)} style={{ fontSize: '0.62em', padding: '2px 8px', borderRadius: 4, border: 'none', background: stickyCol.border, color: '#fff', cursor: 'pointer' }}>Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: size==='small'?'0.77em':'0.92em', color: stickyCol.text, lineHeight: 1.5, wordBreak: 'break-word', marginBottom: 4, paddingTop: c.pinned ? 8 : 0 }}>
                    {c.text}
                  </div>
                  {c.note && (
                    <div style={{ fontSize: '0.69em', color: stickyCol.text, opacity: 0.7, lineHeight: 1.4, marginBottom: 4, fontStyle: 'italic' }}>{c.note}</div>
                  )}
                  <div style={{ fontSize: '0.54em', color: stickyCol.text, opacity: 0.6, marginBottom: 4 }}>
                    {fmtDT(c.updated || c.created)}
                    {c.updated && c.updated !== c.created && ' (edited)'}
                  </div>
                  {/* Tag pill at bottom */}
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: '0.54em', padding: '1px 6px', borderRadius: 8, background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}>{tag.label}</span>
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <button onClick={() => startEdit(c)} style={{ fontSize: '0.54em', padding: '1px 5px', borderRadius: 4, border: `1px solid ${stickyCol.border}`, background: 'rgba(255,255,255,.4)', color: stickyCol.text, cursor: 'pointer' }}>✎</button>
                    <button onClick={() => togglePin(c)} style={{ fontSize: '0.54em', padding: '1px 5px', borderRadius: 4, border: `1px solid ${stickyCol.border}`, background: c.pinned?stickyCol.border:'rgba(255,255,255,.4)', color: c.pinned?'#fff':stickyCol.text, cursor: 'pointer' }}>📌</button>
                    {/* Size quick change */}
                    {['small','normal','large'].map(sz => (
                      <button key={sz} onClick={() => changeSize(c, sz)}
                        style={{ fontSize: '0.47em', padding: '1px 4px', borderRadius: 4, border: `1px solid ${stickyCol.border}`, background: (c.size||'normal')===sz?stickyCol.border:'rgba(255,255,255,.3)', color: (c.size||'normal')===sz?'#fff':stickyCol.text, cursor: 'pointer' }}>{sz[0].toUpperCase()}</button>
                    ))}
                    {/* Color quick change */}
                    {STICKY_COLORS.map(sc => (
                      <button key={sc.id} onClick={() => changeColor(c, sc.id)}
                        style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${(c.color||'pink')===sc.id?sc.border:'transparent'}`, background: sc.bg, cursor: 'pointer', padding: 0 }} />
                    ))}
                    <button onClick={() => onDelete(c.id)} style={{ fontSize: '0.54em', padding: '1px 5px', borderRadius: 4, border: '1px solid #ff335544', background: 'rgba(255,255,255,.4)', color: '#ff3355', cursor: 'pointer' }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tag Manager ───────────────────────────────────────────────────
function TagManager({ tags, onUpdate, onClose }) {
  const [list, setList] = useState(tags.map(t => ({ ...t })))
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#aaaacc')
  const [editingId, setEditingId] = useState(null)

  function addTag() {
    if (!newLabel.trim()) return
    setList(prev => [...prev, { id: uid(), label: newLabel.trim(), color: newColor }])
    setNewLabel(''); setNewColor('#aaaacc')
  }
  function updateTag(id, field, val) { setList(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t)) }
  function removeTag(id) { if (id !== 'unsorted') setList(prev => prev.filter(t => t.id !== id)) }
  function save() {
    const hasFallback = list.find(t => t.id === 'unsorted')
    const final = hasFallback ? list : [...list, DEFAULT_TAGS.find(t => t.id === 'unsorted')]
    onUpdate(final); onClose()
  }

  return (
    <div>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 12, lineHeight: 1.5 }}>
        Add, edit, or remove tags. <strong style={{ color:'var(--dim)' }}>Unsorted</strong> cannot be deleted.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {list.map(t => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={t.color.startsWith('var') ? '#aaaacc' : t.color}
              onChange={e => updateTag(t.id, 'color', e.target.value)}
              style={{ width: 26, height: 24, padding: 0, border: '1px solid var(--brd)', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }} />
            {editingId === t.id ? (
              <input value={t.label} onChange={e => updateTag(t.id, 'label', e.target.value)}
                onBlur={() => setEditingId(null)} onKeyDown={e => e.key === 'Enter' && setEditingId(null)} autoFocus
                style={{ flex: 1, padding: '4px 7px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }} />
            ) : (
              <span style={{ flex: 1, fontSize: '0.85em', color: t.color.startsWith('var') ? 'var(--dim)' : t.color, cursor: 'text' }}
                onClick={() => setEditingId(t.id)}>{t.label}</span>
            )}
            {t.id !== 'unsorted' && (
              <button style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer' }} onClick={() => removeTag(t.id)}>✕</button>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: 10, background: 'rgba(255,255,255,.02)', borderRadius: 'var(--r)', marginBottom: 14 }}>
        <div style={{ fontSize: '0.69em', color: 'var(--dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>Add New Tag</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            style={{ width: 26, height: 24, padding: 0, border: '1px solid var(--brd)', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }} />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Tag name…"
            style={{ flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }} />
          <button onClick={addTag} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: 'var(--cc)', color: '#000', fontSize: '0.77em', fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={save}>Save Tags</button>
      </div>
    </div>
  )
}

// ── Main Journal tab ──────────────────────────────────────────────
export default function Journal({ db }) {
  const [tags, setTags] = useState(DEFAULT_TAGS)
  const [captures, setCaptures] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [mobileView, setMobileView] = useState('capture') // 'capture' | 'stickies'

  // Load from Supabase
  useEffect(() => {
    async function init() {
      if (!hasSupabase) { setLoaded(true); return }
      try {
        const { data: capData } = await supabase.from('entries').select('*').eq('category', 'journal_captures')
        if (capData && capData.length > 0) setCaptures(capData.map(r => ({ id: r.id, ...r.data })))
        const { data: tagData } = await supabase.from('entries').select('*').eq('category', 'journal_tags')
        if (tagData && tagData.length > 0) {
          const loaded = tagData.map(r => ({ id: r.id, ...r.data }))
          if (loaded.length > 0) setTags(loaded)
        }
      } catch (err) { console.error('Journal load error:', err) }
      setLoaded(true)
    }
    init()
  }, [])

  async function saveTags(t) {
    setTags(t)
    if (db?.upsertEntry) t.forEach(tag => db.upsertEntry('journal_tags', tag))
  }

  async function saveCaptures(c) {
    setCaptures(c)
    // Supabase upsert handled per-item
  }

  function addCapture(item) {
    const updated = [item, ...captures]
    saveCaptures(updated)
    if (db?.upsertEntry) db.upsertEntry('journal_captures', item)
  }

  function deleteCapture(id) {
    saveCaptures(captures.filter(c => c.id !== id))
    if (db?.deleteEntry) db.deleteEntry('journal_captures', id)
  }

  function editCapture(item) {
    saveCaptures(captures.map(c => c.id === item.id ? item : c))
    if (db?.upsertEntry) db.upsertEntry('journal_captures', item)
  }

  if (!loaded) return <div style={{ color: 'var(--mut)', padding: 20 }}>Loading journal…</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: 'var(--cc)' }}>📓 Journal</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Mobile toggle */}
          <div className="mobile-only" style={{ display: 'flex', gap: 3, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 20, padding: '2px 4px' }}>
            {[['capture','⚡ Capture'],['stickies','📌 Stickies']].map(([v,l]) => (
              <button key={v} onClick={() => setMobileView(v)}
                style={{ padding: '3px 12px', borderRadius: 16, border: 'none', fontSize: '0.77em', fontWeight: 600,
                  background: mobileView===v ? 'var(--cc)' : 'none', color: mobileView===v ? '#000' : 'var(--dim)', cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowTagManager(true)}
            style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 12, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>
            🏷 Manage Tags
          </button>
        </div>
      </div>

      {/* Main layout: capture left, stickies right */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Left: Quick Capture + Collections list */}
        <div style={{ width: 300, flexShrink: 0, display: typeof window !== 'undefined' && window.innerWidth < 700 && mobileView !== 'capture' ? 'none' : 'block' }}>
          <QuickCapture tags={tags} onAdd={addCapture} />

          {/* Mini collections list */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              All Captures ({captures.length})
            </div>
            {captures.slice().sort((a,b) => new Date(b.created) - new Date(a.created)).map(c => {
              const tag = tags.find(t => t.id === c.tag) || DEFAULT_TAGS[DEFAULT_TAGS.length-1]
              return (
                <div key={c.id} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--card)', borderLeft: `2px solid ${tag.color}`, marginBottom: 4, fontSize: '0.77em', color: 'var(--tx)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text}</span>
                    <button onClick={() => deleteCapture(c.id)} style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.85em', flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ fontSize: '0.62em', color: 'var(--mut)', marginTop: 2 }}>{fmtDT(c.created)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Sticky Board */}
        <div style={{ flex: 1, minWidth: 0, display: typeof window !== 'undefined' && window.innerWidth < 700 && mobileView !== 'stickies' ? 'none' : 'block' }}>
          <StickyBoard
            captures={captures}
            tags={tags}
            onDelete={deleteCapture}
            onEdit={editCapture}
            onReorder={saveCaptures}
          />
        </div>
      </div>

      {/* Tag Manager modal */}
      {showTagManager && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 10px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', width: '100%', maxWidth: 460, padding: 18, position: 'relative' }}>
            <button style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'var(--dim)', fontSize: '1.38em', cursor: 'pointer' }}
              onClick={() => setShowTagManager(false)}>✕</button>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', marginBottom: 14, color: 'var(--cc)' }}>🏷 Manage Tags</div>
            <TagManager tags={tags} onUpdate={saveTags} onClose={() => setShowTagManager(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
