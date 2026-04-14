const TAB_COLOR = '#9d4edd' // Session Log - Purple

import { useState, useEffect, useMemo } from 'react'
import { uid, CATS, TAB_RAINBOW } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Spectrum palette cycling by session number ─────────────────
const SPECTRUM = [
  { bg: '#C9546A1a', border: '#C9546A', text: '#f0a0b4' }, // pink
  { bg: '#C944441a', border: '#C94444', text: '#f0a0a0' }, // red
  { bg: '#C96A3A1a', border: '#C96A3A', text: '#f0b090' }, // orange
  { bg: '#C9A0201a', border: '#C9A020', text: '#f0d080' }, // yellow
  { bg: '#3B8B3B1a', border: '#3B8B3B', text: '#90d090' }, // green
  { bg: '#1A8B7A1a', border: '#1A8B7A', text: '#80d0c8' }, // teal
  { bg: '#1A5AAA1a', border: '#1A5AAA', text: '#80b0e8' }, // blue
  { bg: '#5A3ACC1a', border: '#5A3ACC', text: '#b090f0' }, // indigo
  { bg: '#8A3ACC1a', border: '#8A3ACC', text: '#c890f0' }, // violet
]
function spectrumCol(sessionNumber, listIdx) {
  // Use session_number if valid (>0), otherwise fall back to list position
  const n = (sessionNumber && sessionNumber > 0) ? sessionNumber : (listIdx + 1)
  const idx = (n - 1) % SPECTRUM.length
  return SPECTRUM[idx]
}

// ── Element color palette (used in session form) ───────────────
const ELEMENT_COLORS = {
  Water: { bg: '#EAF3FF', border: '#1A3F7A', text: '#1A3F7A' },
  Fire:  { bg: '#FFF2EA', border: '#7A1A1A', text: '#7A1A1A' },
  Earth: { bg: '#F2FAF0', border: '#3B6D11', text: '#3B6D11' },
  Air:   { bg: '#FDFBEA', border: '#5A4A00', text: '#5A4A00' },
  Mixed: { bg: 'var(--card)', border: 'var(--brd)', text: 'var(--cc)' },
}

const ELEMENT_OPTS = ['Mixed', 'Water', 'Fire', 'Earth', 'Air']

const SECTION_LABELS = [
  { k: 'decisions',  l: 'Canon Decisions / Locks' },
  { k: 'built',      l: 'Built / Fixed' },
  { k: 'completed',  l: 'Completed' },
  { k: 'flags',      l: 'Flags Raised' },
  { k: 'questions',  l: 'Open Questions' },
  { k: 'todo',       l: 'To-Do' },
  { k: 'notes',      l: 'Notes' },
]

// ── Supabase helpers ───────────────────────────────────────────
async function sbLoadSessions() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase
      .from('session_log')
      .select('*')
      .order('date', { ascending: true })
    if (error) { console.warn('Session log table not available:', error.message); return null }
    return data || []
  } catch (e) { console.warn('Session log load failed:', e); return null }
}

async function sbUpsertSession(entry) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').upsert(entry, { onConflict: 'id' })
    if (error) console.warn('Session log upsert skipped:', error.message)
  } catch (e) { console.warn('Session log upsert failed:', e) }
}

async function sbDeleteSession(id) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').delete().eq('id', id)
    if (error) console.warn('Session log delete skipped:', error.message)
  } catch (e) { console.warn('Session log delete failed:', e) }
}

// ── Local storage fallback ─────────────────────────────────────
const LS_KEY = 'gcomp_session_log'
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function lsSave(sessions) { try { localStorage.setItem(LS_KEY, JSON.stringify(sessions)) } catch {} }

// ── Format a session as markdown ──────────────────────────────
function sessionToMd(s) {
  const lines = []
  lines.push(`# Session ${s.session_number} · ${s.date}`)
  if (s.element && s.element !== 'Mixed') lines.push(`*Element: ${s.element}*`)
  if (s.topics) lines.push(`\n**Topics:** ${s.topics}`)
  if (s.opened_at || s.closed_at) lines.push(`\nOpened: ${s.opened_at || '—'} | Closed: ${s.closed_at || '—'}`)
  SECTION_LABELS.forEach(({ k, l }) => {
    if (s[k] && s[k].trim()) lines.push(`\n## ${l}\n\n${s[k]}`)
  })
  lines.push('\n---')
  return lines.join('\n')
}

// ── Empty session template ─────────────────────────────────────
function emptySession(num) {
  return {
    id: uid(), session_number: num,
    date: new Date().toLocaleDateString('en-CA'),
    element: 'Mixed', topics: '',
    opened_at: '', closed_at: '',
    decisions: '', built: '', completed: '',
    flags: '', questions: '', todo: '', notes: '',
  }
}

// ── Session card (view mode) ───────────────────────────────────
function SessionCard({ session, listIdx = 0, onEdit, onDelete, selected, onSelect, fontSize = 12 }) {
  const [expanded, setExpanded] = useState(false)
  const col = spectrumCol(session.session_number, listIdx)
  const hasContent = SECTION_LABELS.some(({ k }) => session[k] && session[k].trim())

  return (
    <div style={{
      background: `linear-gradient(${col.bg}, ${col.bg}), var(--card)`,
      border: `1.5px solid ${col.border}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <input type="checkbox" checked={selected}
          onClick={e => e.stopPropagation()}
          onChange={e => onSelect(e.target.checked)}
          style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: fontSize + 1, fontWeight: 700, color: col.border }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: fontSize - 1, color: col.border, opacity: 0.85, marginTop: 2 }}>
              {session.topics}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4, border: `1px solid ${col.border}`, background: 'none', color: col.border, cursor: 'pointer' }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4, border: '1px solid #cc4444', background: 'none', color: '#cc4444', cursor: 'pointer' }}>✕</button>
          <span style={{ color: col.border, fontSize: '1.08em', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && hasContent && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${col.border}33` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k] || !session[k].trim()) return null
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div style={{ fontSize: fontSize - 2, fontWeight: 700, color: col.border, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: fontSize, color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{session[k]}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Session form (add/edit) ────────────────────────────────────
function SessionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const col = ELEMENT_COLORS[form.element] || ELEMENT_COLORS.Mixed
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const inputStyle = {
    width: '100%', padding: '6px 9px', borderRadius: 6,
    border: `1px solid ${col.border}66`, background: 'var(--sf)',
    color: 'var(--tx)', fontSize: '0.92em', outline: 'none', boxSizing: 'border-box',
  }
  const taStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

  return (
    <div style={{ background: 'var(--sf)', border: `2px solid ${col.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: col.text, fontWeight: 700 }}>
          {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: col.text, cursor: 'pointer', fontSize: '1.38em', opacity: 0.6, padding: '0 4px', lineHeight: 1 }} title="Close">✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Session #</div>
          <input type="number" value={form.session_number} onChange={e => set('session_number', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Date</div>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Element</div>
          <select value={form.element} onChange={e => set('element', e.target.value)} style={inputStyle}>
            {ELEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Opened</div>
          <input value={form.opened_at} onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 9:43 AM CDT" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Closed</div>
          <input value={form.closed_at} onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 11:30 PM CDT" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Topics</div>
        <input value={form.topics} onChange={e => set('topics', e.target.value)} placeholder="Brief summary…" style={inputStyle} />
      </div>
      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.77em', color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
          <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={`${l}…`} style={taStyle} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.92em' }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: col.border, color: '#fff', cursor: 'pointer', fontSize: '0.92em', fontWeight: 700 }}>Save Session</button>
      </div>
    </div>
  )
}

// ── Activity Log component ────────────────────────────────────────
function ActivityLog({ db, goTo, compact }) {
  const [filterCat, setFilterCat] = useState('all')
  const [limit, setLimit] = useState(compact ? 30 : 50)

  const allActivity = useMemo(() => {
    if (!db?.db) return []
    const items = []
    const skip = new Set(['family_tree', 'settings', 'session_log'])
    Object.entries(db.db).forEach(([cat, entries]) => {
      if (skip.has(cat) || !Array.isArray(entries)) return
      entries.forEach(e => {
        const ts = e.updated_at || e.updated || e.created || null
        if (!ts) return
        items.push({ id: e.id, cat, name: e.name || e.title || e.display_name || e.word || e.chapter_num || '(unnamed)', ts, status: e.status || null })
      })
    })
    return items.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  }, [db?.db])

  const cats = useMemo(() => {
    const c = new Set(allActivity.map(a => a.cat))
    return ['all', ...c]
  }, [allActivity])

  const filtered = filterCat === 'all' ? allActivity : allActivity.filter(a => a.cat === filterCat)

  if (!allActivity.length) return (
    <div className="empty"><div className="empty-icon">⚡</div><p>No activity yet.</p></div>
  )

  return (
    <div>
      <div style={{ fontSize: '0.77em', color: 'var(--mut)', marginBottom: 8 }}>
        Entries with edit timestamps, newest first.
      </div>
      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {cats.map(c => {
          const cat = CATS?.[c]
          const color = TAB_RAINBOW?.[c] || 'var(--cc)'
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ fontSize: '0.69em', padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                background: filterCat === c ? color : 'none',
                color: filterCat === c ? '#000' : 'var(--dim)',
                border: `1px solid ${filterCat === c ? color : 'var(--brd)'}` }}>
              {c === 'all' ? 'All' : (cat?.i ? `${cat.i} ${cat.l}` : c)}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filtered.slice(0, limit).map((a, i) => {
          const d = new Date(a.ts)
          const dateStr = isNaN(d) ? a.ts : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const timeStr = isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const catColor = TAB_RAINBOW?.[a.cat] || 'var(--cc)'
          return (
            <div key={a.id + i} style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px', background: i % 2 === 0 ? 'var(--card)' : 'transparent',
              borderRadius: 4, fontSize: '0.85em', borderLeft: `2px solid ${catColor}44` }}>
              <span style={{ minWidth: compact ? 70 : 80, color: 'var(--mut)', fontSize: '0.77em', flexShrink: 0 }}>{dateStr}</span>
              {!compact && timeStr && <span style={{ minWidth: 55, color: 'var(--mut)', fontSize: '0.77em', flexShrink: 0 }}>{timeStr}</span>}
              <span style={{ flex: 1, color: 'var(--tx)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <span style={{ fontSize: '0.69em', color: catColor, opacity: 0.85, flexShrink: 0 }}>{CATS?.[a.cat]?.l || a.cat}</span>
              {a.status && <span style={{ fontSize: '0.62em', color: 'var(--mut)', flexShrink: 0 }}>{a.status}</span>}
              {/* Cross-link button */}
              {goTo && CATS?.[a.cat] && (
                <button onClick={() => goTo(a.cat)}
                  title={`Go to ${CATS[a.cat].l}`}
                  style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                    background: 'none', border: `1px solid ${catColor}66`, color: catColor, cursor: 'pointer' }}>→</button>
              )}
            </div>
          )
        })}
      </div>
      {filtered.length > limit && (
        <button onClick={() => setLimit(l => l + 50)}
          style={{ marginTop: 8, fontSize: '0.85em', padding: '4px 12px', borderRadius: 6,
            background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  )
}

// ── Feature Log component ─────────────────────────────────────────
const DEFAULT_FEATURES = [
  { id: 'tab_dashboard', name: 'Dashboard', type: 'Tab', status: 'active', notes: 'Left sidebar nav + 4-panel hub (Recent, Questions, Flags, Canon)', tabKey: 'dashboard' },
  { id: 'tab_wiki', name: 'Wiki', type: 'Tab', status: 'active', notes: 'Long-form lore articles with blocks (text, table, callout, image)', tabKey: 'wiki' },
  { id: 'tab_glossary', name: 'Glossary', type: 'Tab', status: 'active', notes: 'Filtered compact view of Wiki articles', tabKey: 'glossary' },
  { id: 'tab_characters', name: 'Characters', type: 'Tab', status: 'active', notes: 'Character cards with bubble colors, element filters, crosslinks to Scenes', tabKey: 'characters' },
  { id: 'tab_familytree', name: 'Family Tree', type: 'Tab', status: 'active', notes: 'Canvas drag/drop + web/force-directed toggle view', tabKey: 'familytree' },
  { id: 'tab_world', name: 'World', type: 'Tab', status: 'active', notes: 'World-building entries (geography, culture, etc)', tabKey: 'world' },
  { id: 'tab_locations', name: 'Locations', type: 'Tab', status: 'active', notes: 'Location entries with flat table view', tabKey: 'locations' },
  { id: 'tab_maps', name: 'Maps', type: 'Tab', status: 'active', notes: 'Drag-to-reorder maps, XS–XL image height, zoom lightbox', tabKey: 'map' },
  { id: 'tab_manuscript', name: 'Manuscript', type: 'Tab', status: 'active', notes: 'Book shelf → cover lightbox → TOC → chapter editor', tabKey: 'manuscript' },
  { id: 'tab_scenes', name: 'Scenes', type: 'Tab', status: 'active', notes: 'Wrapped timeline, chapter bracket design, gradient chapter colors, summary text', tabKey: 'scenes' },
  { id: 'tab_timeline', name: 'Timeline', type: 'Tab', status: 'active', notes: 'Visual track + card grid. XS=8 cols, XL=1 col full-screen', tabKey: 'timeline' },
  { id: 'tab_eras', name: 'Eras & Dating', type: 'Tab', status: 'active', notes: 'Era spans with persistent Supabase edits', tabKey: 'eras' },
  { id: 'tab_calendar', name: 'Calendar', type: 'Tab', status: 'active', notes: 'Lajen 12-month calendar. XS–XL grid, Expand All, day notes, birthdays', tabKey: 'calendar' },
  { id: 'tab_inventory', name: 'Inventory', type: 'Tab', status: 'active', notes: 'Bubble/list/outfit views. Drag order. Transfer history. OutfitSnapshot inside.', tabKey: 'inventory' },
  { id: 'tab_wardrobe', name: 'Wardrobe', type: 'Tab', status: 'active', notes: 'Character wardrobe entries. XS–XL.', tabKey: 'wardrobe' },
  { id: 'tab_items', name: 'Items', type: 'Tab', status: 'active', notes: 'Item entries. XS–XL size picker.', tabKey: 'items' },
  { id: 'tab_flags', name: 'Flags', type: 'Tab', status: 'active', notes: 'Continuity flags. XS–XL.', tabKey: 'flags' },
  { id: 'tab_questions', name: 'Questions', type: 'Tab', status: 'active', notes: 'Open canon questions.', tabKey: 'questions' },
  { id: 'tab_canon', name: 'Canon', type: 'Tab', status: 'active', notes: 'Locked canon entries.', tabKey: 'canon' },
  { id: 'tab_spellings', name: 'Spellings', type: 'Tab', status: 'active', notes: 'Canonical spelling reference.', tabKey: 'spellings' },
  { id: 'tab_notes', name: 'Notes', type: 'Tab', status: 'active', notes: 'Structured lore notes with categories and click-to-view popup.', tabKey: 'notes' },
  { id: 'tab_journal', name: 'Journal', type: 'Tab', status: 'active', notes: 'Quick Capture (left) + Stickies board (right). Pastel sticky notes, drag, pin, filters.', tabKey: 'journal' },
  { id: 'tab_tools', name: 'Tools', type: 'Tab', status: 'active', notes: "Date converter, Ix'Citlatl names, Pronunciation & Translation helper.", tabKey: 'tools' },
  { id: 'tab_sessionlog', name: 'Session Log', type: 'Tab', status: 'active', notes: 'Per-session working minutes. Sessions tab + combined Activity/Feature view.', tabKey: 'sessionlog' },
  { id: 'feat_quickcap', name: 'Quick Capture (Ctrl+Q)', type: 'Feature', status: 'active', notes: 'Floating ✦ button bottom-right. Ctrl+Q shortcut. Dumps to journal_captures.' },
  { id: 'feat_altarrow', name: 'Keyboard Nav (Alt+←/→)', type: 'Feature', status: 'active', notes: 'Alt+←/→ navigate between tabs.' },
  { id: 'feat_crosslink', name: 'CrossLink System', type: 'Feature', status: 'active', notes: 'Tabs can jump to each other with entry expansion.' },
  { id: 'feat_fontscale', name: 'Font Scale (A+/A−)', type: 'Feature', status: 'active', notes: 'All text scales via A+/A− buttons in nav bar.' },
  { id: 'feat_export_md', name: 'Export to .md', type: 'Feature', status: 'active', notes: 'IOBar Export button generates full Compendium as markdown file.' },
  { id: 'feat_timestamps', name: 'Last-Edited Timestamps', type: 'Feature', status: 'active', notes: 'Entry cards show last-edited date/time. Powers Activity Log.' },
  { id: 'feat_activity_log', name: 'Activity Log', type: 'Feature', status: 'active', notes: 'Session Log sub-view. Logs every add/edit/delete with timestamp and tab link.' },
]

function FeatureLog({ db, goTo, compact }) {
  const LS_KEY = 'gcomp_feature_log'
  const [features, setFeatures] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      if (saved.length) return saved
      return DEFAULT_FEATURES
    } catch { return DEFAULT_FEATURES }
  })
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [adding, setAdding] = useState(false)
  const [newFeat, setNewFeat] = useState({ name: '', type: 'Feature', status: 'active', notes: '' })

  function save(updated) { setFeatures(updated); try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch {} }
  function remove(id) { save(features.filter(f => f.id !== id)) }
  function toggle(id) { save(features.map(f => f.id === id ? { ...f, status: f.status === 'active' ? 'retired' : 'active' } : f)) }
  function addFeature() {
    if (!newFeat.name.trim()) return
    save([...features, { ...newFeat, id: 'feat_' + Date.now() }])
    setNewFeat({ name: '', type: 'Feature', status: 'active', notes: '' })
    setAdding(false)
  }

  const types = ['all', ...new Set(features.map(f => f.type))]
  const filtered = features.filter(f => {
    const mt = filterType === 'all' || f.type === filterType
    const ms = filterStatus === 'all' || f.status === filterStatus
    return mt && ms
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 7px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize: '0.77em', padding: '3px 7px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
        </select>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{filtered.length} features</span>
        {!compact && (
          <button className="btn btn-sm" style={{ background: TAB_COLOR, color: '#fff', marginLeft: 'auto' }}
            onClick={() => setAdding(true)}>+ Add Feature</button>
        )}
      </div>

      {adding && !compact && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input value={newFeat.name} onChange={e => setNewFeat(p => ({ ...p, name: e.target.value }))}
              placeholder="Feature name" style={{ flex: 2, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontSize: '0.85em' }} />
            <select value={newFeat.type} onChange={e => setNewFeat(p => ({ ...p, type: e.target.value }))}
              style={{ padding: '4px 7px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontSize: '0.85em' }}>
              <option>Tab</option><option>Feature</option><option>Tool</option>
            </select>
            <input value={newFeat.notes} onChange={e => setNewFeat(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)" style={{ flex: 3, padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', fontSize: '0.85em' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-sm btn-outline" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-sm" style={{ background: TAB_COLOR, color: '#fff' }} onClick={addFeature}>Add</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.map(f => {
          const tabColor = f.tabKey ? (TAB_RAINBOW?.[f.tabKey] || TAB_COLOR) : TAB_COLOR
          return (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 8px',
              background: 'var(--card)', borderLeft: `3px solid ${f.status === 'retired' ? 'var(--brd)' : tabColor}`,
              borderRadius: 4, opacity: f.status === 'retired' ? 0.5 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--tx)' }}>{f.name}</span>
                  <span style={{ fontSize: '0.62em', padding: '1px 5px', borderRadius: 4,
                    background: f.type === 'Tab' ? '#3a86ff22' : '#38b00022',
                    color: f.type === 'Tab' ? '#3a86ff' : '#38b000',
                    border: `1px solid ${f.type === 'Tab' ? '#3a86ff44' : '#38b00044'}` }}>{f.type}</span>
                  {f.status === 'retired' && <span style={{ fontSize: '0.62em', color: 'var(--mut)' }}>retired</span>}
                </div>
                {f.notes && <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 2 }}>{f.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
                {/* Tab jump link */}
                {goTo && f.tabKey && (
                  <button onClick={() => goTo(f.tabKey)} title={`Go to ${f.name} tab`}
                    style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 4,
                      background: 'none', border: `1px solid ${tabColor}66`, color: tabColor, cursor: 'pointer' }}>→</button>
                )}
                {!compact && (
                  <>
                    <button onClick={() => toggle(f.id)}
                      style={{ fontSize: '0.62em', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--brd)',
                        background: 'none', color: 'var(--mut)', cursor: 'pointer' }}>
                      {f.status === 'active' ? 'Retire' : 'Restore'}
                    </button>
                    <button onClick={() => remove(f.id)}
                      style={{ fontSize: '0.62em', padding: '1px 5px', borderRadius: 4, border: '1px solid #ff335544',
                        background: 'none', color: '#ff3355', cursor: 'pointer' }}>✕</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main SessionLog tab ────────────────────────────────────────
export default function SessionLog({ db, goTo, navSearch }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState(navSearch || '')
  useEffect(() => { if (navSearch !== undefined) setSearch(navSearch) }, [navSearch])
  const [filterEl, setFilterEl] = useState('All')
  const [fontSize, setFontSize] = useState(12)
  const [activeView, setActiveView] = useState('sessions') // 'sessions' | 'combined'

  function flash(text, ms = 2500) { setMsg(text); setTimeout(() => setMsg(''), ms) }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const local = lsLoad()
      setSessions(local)
      if (hasSupabase) {
        const remote = await sbLoadSessions()
        if (remote) { setSessions(remote); lsSave(remote) }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveSession(form) {
    const entry = { ...form, session_number: Number(form.session_number) }
    const updated = sessions.find(s => s.id === entry.id)
      ? sessions.map(s => s.id === entry.id ? entry : s)
      : [...sessions, entry].sort((a, b) => a.session_number - b.session_number)
    setSessions(updated); lsSave(updated)
    await sbUpsertSession(entry)
    setEditing(null); setAdding(false)
    flash('Session saved.')
  }

  async function deleteSession(id) {
    if (!confirm('Delete this session entry?')) return
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated); lsSave(updated)
    await sbDeleteSession(id)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    flash('Session deleted.')
  }

  function toggleSelect(id, checked) {
    setSelected(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }
  function selectAll() { setSelected(new Set(filtered.map(s => s.id))) }
  function clearSelection() { setSelected(new Set()) }

  function exportSelected() {
    const toExport = sessions.filter(s => selected.has(s.id)).sort((a, b) => a.session_number - b.session_number)
    if (!toExport.length) { flash('No sessions selected.'); return }
    const header = `# The Guardians of Lajen — Session Log\n\n*Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const blob = new Blob([header + toExport.map(sessionToMd).join('\n\n')], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = toExport.length === 1 ? `session_${toExport[0].session_number}_${toExport[0].date}.md` : `guardians_sessions_export_${new Date().toISOString().slice(0,10)}.md`
    a.click(); flash(`Exported ${toExport.length} session${toExport.length > 1 ? 's' : ''}.`)
  }

  function exportAll() {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number)
    if (!sorted.length) { flash('No sessions to export.'); return }
    const header = `# The Guardians of Lajen — Complete Session Log\n\n*Sahrynar (Melissa) & Claude · Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const blob = new Blob([header + sorted.map(sessionToMd).join('\n\n')], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_session_log_complete_${new Date().toISOString().slice(0,10)}.md`
    a.click(); flash(`Exported all ${sorted.length} sessions.`)
  }

  const filtered = sessions.filter(s => {
    const matchEl = filterEl === 'All' || s.element === filterEl
    const q = search.toLowerCase()
    const matchQ = !q || [s.topics, s.decisions, s.built, s.notes, s.questions, s.flags, s.todo, s.completed]
      .some(f => f && f.toLowerCase().includes(q))
    return matchEl && matchQ
  })

  const nextNum = sessions.length ? Math.max(...sessions.map(s => Number(s.session_number))) + 1 : 13

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontFamily: "'Cinzel',serif" }}>
      Loading session log…
    </div>
  )

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        {[['sessions', '📋 Sessions'], ['combined', '⚡ Activity & Features']].map(([v, l]) => (
          <button key={v} onClick={() => setActiveView(v)}
            style={{ fontSize: '0.85em', padding: '4px 14px', borderRadius: 16, fontWeight: 600,
              background: activeView === v ? TAB_COLOR : 'var(--card)',
              color: activeView === v ? '#fff' : 'var(--dim)',
              border: `1px solid ${activeView === v ? TAB_COLOR : 'var(--brd)'}`,
              cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* ── Combined Activity + Feature view ── */}
      {activeView === 'combined' && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Activity Log — left half */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: TAB_COLOR, marginBottom: 10, fontWeight: 700 }}>
              ⚡ Activity Log
            </div>
            <ActivityLog db={db} goTo={goTo} compact={true} />
          </div>
          {/* Divider */}
          <div style={{ width: 1, background: 'var(--brd)', alignSelf: 'stretch', flexShrink: 0 }} />
          {/* Feature Log — right half */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.92em', color: TAB_COLOR, marginBottom: 10, fontWeight: 700 }}>
              🗂 Feature Log
            </div>
            <FeatureLog db={db} goTo={goTo} compact={true} />
          </div>
        </div>
      )}

      {/* ── Sessions view ── */}
      {activeView === 'sessions' && (<>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: TAB_COLOR }}>
            📋 Session Log
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginRight: 4 }}>
              <button onClick={() => setFontSize(s => Math.max(9, s - 1))}
                style={{ fontSize: '0.77em', padding: '2px 6px', borderRadius: 4, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>A−</button>
              <button onClick={() => setFontSize(s => Math.min(18, s + 1))}
                style={{ fontSize: '0.77em', padding: '2px 6px', borderRadius: 4, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>A+</button>
            </div>
            {selected.size > 0 && (
              <>
                <button onClick={exportSelected} style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: `1px solid ${TAB_COLOR}`, background: 'none', color: TAB_COLOR, cursor: 'pointer' }}>
                  ↓ Export {selected.size} selected
                </button>
                <button onClick={clearSelection} style={{ fontSize: '0.85em', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>Clear</button>
              </>
            )}
            <button onClick={exportAll} style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
              ↓ Export All
            </button>
            <button onClick={() => { setAdding(true); setEditing(null) }}
              style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: 'none', background: TAB_COLOR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              + New Session
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ fontSize: '0.92em', color: TAB_COLOR, marginBottom: 10, padding: '6px 12px', background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>{msg}</div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
            style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.92em', outline: 'none' }} />
          {filtered.length > 0 && (
            <button onClick={selectAll} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
              Select all visible
            </button>
          )}
        </div>

        {adding && <SessionForm initial={emptySession(nextNum)} onSave={saveSession} onCancel={() => setAdding(false)} />}
        {editing && <SessionForm initial={editing} onSave={saveSession} onCancel={() => setEditing(null)} />}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontStyle: 'italic', fontSize: '1em' }}>
            {sessions.length === 0 ? 'No sessions yet. Add your first one!' : 'No sessions match this filter.'}
          </div>
        ) : (
          filtered.map((s, si) => (
            <SessionCard key={s.id} session={s} listIdx={si}
              onEdit={s => { setEditing(s); setAdding(false) }}
              onDelete={deleteSession}
              selected={selected.has(s.id)}
              onSelect={checked => toggleSelect(s.id, checked)}
              fontSize={fontSize} />
          ))
        )}

        <div style={{ fontSize: '0.85em', color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Synced to cloud' : 'Local only'}
        </div>
      </>)}
    </div>
  )
}
