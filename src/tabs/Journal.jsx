import { useState, useEffect, useRef } from 'react'
import { uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Default starter tags ─────────────────────────────────────────
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

// ── Persistence helpers ──────────────────────────────────────────
function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function saveLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── Tag pill ─────────────────────────────────────────────────────
function TagPill({ tag, active, onClick, size = 'normal' }) {
  const small = size === 'small'
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? '1px 7px' : '2px 10px',
        borderRadius: 12,
        border: `1px solid ${tag.color}66`,
        background: active ? `${tag.color}22` : 'none',
        color: active ? tag.color : 'var(--dim)',
        fontSize: small ? 9 : 10,
        cursor: 'pointer',
        transition: '.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {tag.label}
    </button>
  )
}

// ── Zone 1: Quick Capture ────────────────────────────────────────
function QuickCapture({ tags, onAdd }) {
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [selectedTag, setSelectedTag] = useState('unsorted')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef()

  function submit() {
    if (!text.trim()) return
    onAdd({
      id: uid(),
      text: text.trim(),
      note: note.trim(),
      tag: selectedTag,
      created: new Date().toISOString(),
    })
    setText('')
    setNote('')
    setSelectedTag('unsorted')
    setExpanded(false)
    inputRef.current?.focus()
  }

  const tag = tags.find(t => t.id === selectedTag) || tags[tags.length - 1]

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${tag.color}44`,
      borderRadius: 'var(--rl)', padding: 14, marginBottom: 14,
      transition: 'border-color .2s',
    }}>
      <div style={{ fontSize: '0.85em', color: tag.color, fontFamily: "'Cinzel',serif", marginBottom: 10, fontWeight: 700 }}>
        ⚡ Quick Capture
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); if (!expanded && e.target.value) setExpanded(true) }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="Word, name, idea… press Enter to save"
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 'var(--r)',
            border: '1px solid var(--brd)', background: 'var(--sf)',
            color: 'var(--tx)', fontSize: '0.92em', outline: 'none',
          }}
          onFocus={() => setExpanded(true)}
        />
        <button
          onClick={submit}
          style={{
            padding: '7px 14px', borderRadius: 'var(--r)', border: 'none',
            background: tag.color, color: '#000', fontSize: '0.85em', fontWeight: 700,
            cursor: 'pointer', transition: '.15s', flexShrink: 0,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = ''}
        >Save</button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {/* Tag picker */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.69em', color: 'var(--dim)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tag</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <TagPill key={t.id} tag={t} active={selectedTag === t.id} onClick={() => setSelectedTag(t.id)} />
              ))}
            </div>
          </div>
          {/* Optional note */}
          <div>
            <div style={{ fontSize: '0.69em', color: 'var(--dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>Note (optional)</div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="What could this be? Any context…"
              style={{
                width: '100%', padding: '6px 9px', borderRadius: 'var(--r)',
                border: '1px solid var(--brd)', background: 'var(--sf)',
                color: 'var(--tx)', fontSize: '0.85em', outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Zone 2: Collections ──────────────────────────────────────────
function Collections({ captures, tags, onDelete, onEdit }) {
  const [activeTag, setActiveTag] = useState('all')
  const [sortMode, setSortMode] = useState('newest')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editTag, setEditTag] = useState('')

  function startEdit(item) {
    setEditingId(item.id)
    setEditText(item.text)
    setEditNote(item.note || '')
    setEditTag(item.tag || 'unsorted')
  }

  function saveEdit(item) {
    onEdit({ ...item, text: editText, note: editNote, tag: editTag })
    setEditingId(null)
  }

  const filtered = captures
    .filter(c => activeTag === 'all' || c.tag === activeTag)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.created) - new Date(a.created)
      if (sortMode === 'oldest') return new Date(a.created) - new Date(b.created)
      return (a.text || '').localeCompare(b.text || '')
    })

  // Count per tag
  const tagCounts = {}
  captures.forEach(c => { tagCounts[c.tag] = (tagCounts[c.tag] || 0) + 1 })

  const allTag = { id: 'all', label: `All (${captures.length})`, color: 'var(--dim)' }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.85em', color: 'var(--cca)', fontFamily: "'Cinzel',serif", fontWeight: 700 }}>
          🗂 Collections
        </div>
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value)}
          style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)', cursor: 'pointer' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="alpha">A → Z</option>
        </select>
      </div>

      {/* Tag filter */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        <TagPill tag={allTag} active={activeTag === 'all'} onClick={() => setActiveTag('all')} />
        {tags.filter(t => tagCounts[t.id]).map(t => (
          <TagPill key={t.id}
            tag={{ ...t, label: `${t.label} (${tagCounts[t.id] || 0})` }}
            active={activeTag === t.id}
            onClick={() => setActiveTag(t.id)}
          />
        ))}
      </div>

      {/* Entries */}
      {!filtered.length ? (
        <div style={{ fontSize: '0.85em', color: 'var(--mut)', padding: '16px 0', textAlign: 'center' }}>
          {captures.length ? 'Nothing in this tag yet.' : 'Nothing captured yet — use Quick Capture above!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(item => {
            const tag = tags.find(t => t.id === item.tag) || tags[tags.length - 1]
            const isEditing = editingId === item.id
            return (
              <div key={item.id} style={{
                background: 'var(--card)', border: `1px solid var(--brd)`,
                borderLeft: `3px solid ${tag.color}`,
                borderRadius: 'var(--r)', padding: '8px 10px',
                transition: '.12s',
              }}>
                {isEditing ? (
                  <div>
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.92em', marginBottom: 6, outline: 'none' }}
                      autoFocus
                    />
                    <input
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      placeholder="Note…"
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)', fontSize: '0.85em', marginBottom: 8, outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                      {tags.map(t => <TagPill key={t.id} tag={t} active={editTag === t.id} onClick={() => setEditTag(t.id)} size="small" />)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 4, background: tag.color, border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700 }}
                        onClick={() => saveEdit(item)}>Save</button>
                      <button style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 4, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}
                        onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1em', fontWeight: 700, fontFamily: "'Cinzel',serif", color: tag.color, marginBottom: item.note ? 3 : 0 }}>
                        {item.text}
                      </div>
                      {item.note && <div style={{ fontSize: '0.85em', color: 'var(--dim)', fontStyle: 'italic' }}>{item.note}</div>}
                      <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 4 }}>
                        {new Date(item.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        <span style={{ color: tag.color }}>{tag.label}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.85em', padding: '2px 4px' }}
                        onClick={() => startEdit(item)} title="Edit">✎</button>
                      <button style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.85em', padding: '2px 4px' }}
                        onClick={() => onDelete(item.id)} title="Delete">✕</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Zone 3: Session Notes ────────────────────────────────────────
function SessionNotes() {
  const [notes, setNotes] = useState(() => loadLocal('gcomp_session_notes', []))
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(null)

  function saveNote() {
    if (!draft.trim()) return
    const updated = [{
      id: uid(),
      text: draft.trim(),
      created: new Date().toISOString(),
    }, ...notes]
    setNotes(updated)
    saveLocal('gcomp_session_notes', updated)
    setDraft('')
  }

  function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveLocal('gcomp_session_notes', updated)
  }

  return (
    <div>
      <div style={{ fontSize: '0.85em', color: 'var(--ct)', fontFamily: "'Cinzel',serif", fontWeight: 700, marginBottom: 10 }}>
        📝 Session Notes
      </div>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 8 }}>
        Free-form writing — thoughts, decisions, rambles. Date-stamped automatically.
      </div>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="What are you working on? What did you decide? What's bugging you?…"
        style={{
          width: '100%', minHeight: 80, padding: '8px 10px',
          borderRadius: 'var(--r)', border: '1px solid var(--brd)',
          background: 'var(--sf)', color: 'var(--tx)',
          fontSize: '0.92em', resize: 'vertical', outline: 'none',
          lineHeight: 1.5, marginBottom: 6,
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.ctrlKey) saveNote()
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>Ctrl+Enter to save</span>
        <button
          onClick={saveNote}
          style={{ padding: '5px 14px', borderRadius: 'var(--r)', border: 'none', background: 'var(--ct)', color: '#000', fontSize: '0.85em', fontWeight: 700, cursor: 'pointer' }}
        >Save Note</button>
      </div>

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.map(n => (
            <div key={n.id}
              style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: '3px solid var(--ct)', borderRadius: 'var(--r)', padding: '8px 10px', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85em', color: 'var(--tx)', lineHeight: 1.4 }}>
                    {expanded === n.id ? n.text : (n.text.length > 120 ? n.text.slice(0, 120) + '…' : n.text)}
                  </div>
                  <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 4 }}>
                    {new Date(n.created).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.85em', padding: '0 2px', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); deleteNote(n.id) }}
                  title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tag Manager ──────────────────────────────────────────────────
function TagManager({ tags, onUpdate, onClose }) {
  const [list, setList] = useState(tags.map(t => ({ ...t })))
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#aaaacc')
  const [editingId, setEditingId] = useState(null)

  function addTag() {
    if (!newLabel.trim()) return
    const newTag = { id: uid(), label: newLabel.trim(), color: newColor }
    setList(prev => [...prev, newTag])
    setNewLabel('')
    setNewColor('#aaaacc')
  }

  function updateTag(id, field, val) {
    setList(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t))
  }

  function removeTag(id) {
    // Don't delete unsorted — it's the fallback
    if (id === 'unsorted') return
    setList(prev => prev.filter(t => t.id !== id))
  }

  function save() {
    // Always ensure unsorted exists
    const hasFallback = list.find(t => t.id === 'unsorted')
    const final = hasFallback ? list : [...list, DEFAULT_TAGS.find(t => t.id === 'unsorted')]
    onUpdate(final)
    onClose()
  }

  return (
    <div>
      <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 12, lineHeight: 1.5 }}>
        Add, edit, or remove tags. The <strong style={{ color: 'var(--dim)' }}>Unsorted</strong> tag cannot be deleted — it's the fallback.
      </div>

      {/* Existing tags */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {list.map(t => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={t.color.startsWith('var') ? '#aaaacc' : t.color}
              onChange={e => updateTag(t.id, 'color', e.target.value)}
              style={{ width: 26, height: 24, padding: 0, border: '1px solid var(--brd)', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
            />
            {editingId === t.id ? (
              <input
                value={t.label}
                onChange={e => updateTag(t.id, 'label', e.target.value)}
                onBlur={() => setEditingId(null)}
                onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                autoFocus
                style={{ flex: 1, padding: '4px 7px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: '0.85em', color: t.color.startsWith('var') ? 'var(--dim)' : t.color, cursor: 'text' }}
                onClick={() => setEditingId(t.id)}>{t.label}</span>
            )}
            {t.id !== 'unsorted' && (
              <button style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '0.92em' }}
                onClick={() => removeTag(t.id)}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ padding: '10px', background: 'rgba(255,255,255,.02)', borderRadius: 'var(--r)', marginBottom: 14 }}>
        <div style={{ fontSize: '0.69em', color: 'var(--dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>Add New Tag</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            style={{ width: 26, height: 24, padding: 0, border: '1px solid var(--brd)', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }} />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Tag name…"
            style={{ flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.85em', outline: 'none' }} />
          <button onClick={addTag}
            style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: 'var(--cc)', color: '#000', fontSize: '0.77em', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>+ Add</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={save}>Save Tags</button>
      </div>
    </div>
  )
}

// ── Main Journal tab ─────────────────────────────────────────────
export default function Journal({ db }) {
  const [tags, setTags] = useState(() => loadLocal('gcomp_journal_tags', DEFAULT_TAGS))
  const [captures, setCaptures] = useState(() => loadLocal('gcomp_captures', []))
  const [showTagManager, setShowTagManager] = useState(false)
  const [activeZone, setActiveZone] = useState('capture')

  // Load from Supabase on mount, fall back to localStorage
  useEffect(() => {
    async function init() {
      if (!hasSupabase) return
      try {
        const { supabase: sb } = await import('../supabase')
        const { data: capData } = await sb.from('entries').select('*').eq('category', 'journal_captures')
        if (capData && capData.length > 0) {
          const loaded = capData.map(r => ({ id: r.id, ...r.data }))
          setCaptures(loaded)
          saveLocal('gcomp_captures', loaded)
        }
        const { data: tagData } = await sb.from('entries').select('*').eq('category', 'journal_tags')
        if (tagData && tagData.length > 0) {
          const loadedTags = tagData.map(r => ({ id: r.id, ...r.data }))
          if (loadedTags.length > 0) {
            setTags(loadedTags)
            saveLocal('gcomp_journal_tags', loadedTags)
          }
        }
      } catch (err) { console.error('Journal Supabase load error:', err) }
    }
    init()
  }, [])

  async function saveTags(t) {
    setTags(t)
    saveLocal('gcomp_journal_tags', t)
    if (db?.upsertEntry) t.forEach(tag => db.upsertEntry('journal_tags', tag))
  }

  async function saveCaptures(c) {
    setCaptures(c)
    saveLocal('gcomp_captures', c)
    if (db?.upsertEntry) c.forEach(cap => db.upsertEntry('journal_captures', cap))
  }

  function addCapture(item) {
    const updated = [item, ...captures]
    saveCaptures(updated)
  }

  function deleteCapture(id) {
    saveCaptures(captures.filter(c => c.id !== id))
    if (db?.deleteEntry) db.deleteEntry('journal_captures', id)
  }

  function editCapture(item) {
    saveCaptures(captures.map(c => c.id === item.id ? item : c))
  }

  const zones = [
    { id: 'capture', label: '⚡ Capture', color: 'var(--cc)' },
    { id: 'notes',   label: '📝 Notes',   color: 'var(--ct)' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: 'var(--cc)' }}>
          📓 Journal
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Zone switcher */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 20, padding: '2px 4px' }}>
            {zones.map(z => (
              <button key={z.id}
                onClick={() => setActiveZone(z.id)}
                style={{
                  padding: '3px 12px', borderRadius: 16, border: 'none', fontSize: '0.77em', fontWeight: 600,
                  background: activeZone === z.id ? z.color : 'none',
                  color: activeZone === z.id ? '#000' : 'var(--dim)',
                  cursor: 'pointer', transition: '.15s',
                }}>
                {z.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTagManager(true)}
            style={{ fontSize: '0.77em', padding: '4px 10px', borderRadius: 12, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer', transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cc)'; e.currentTarget.style.color = 'var(--cc)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--brd)'; e.currentTarget.style.color = 'var(--dim)' }}
          >
            🏷 Manage Tags
          </button>
        </div>
      </div>

      {/* Capture zone */}
      {activeZone === 'capture' && (
        <>
          <QuickCapture tags={tags} onAdd={addCapture} />
          <Collections
            captures={captures}
            tags={tags}
            onDelete={deleteCapture}
            onEdit={editCapture}
          />
        </>
      )}

      {/* Notes zone */}
      {activeZone === 'notes' && (
        <SessionNotes />
      )}

      {/* Tag Manager modal */}
      {showTagManager && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.75)',
          backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center',
          alignItems: 'flex-start', padding: '24px 10px', overflowY: 'auto',
        }}>
          <div style={{
            background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)',
            width: '100%', maxWidth: 460, padding: 18, position: 'relative',
          }}>
            <button
              style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'var(--dim)', fontSize: '1.38em', cursor: 'pointer' }}
              onClick={() => setShowTagManager(false)}>✕</button>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.08em', marginBottom: 14, color: 'var(--cc)' }}>🏷 Manage Tags</div>
            <TagManager tags={tags} onUpdate={saveTags} onClose={() => setShowTagManager(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
