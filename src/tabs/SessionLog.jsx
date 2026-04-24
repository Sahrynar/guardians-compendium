import { useState, useEffect } from 'react'
import { TAB_RAINBOW, uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Rainbow spectrum for session cards ─────────────────────────
// Session cards use the TAB_RAINBOW cycling through sessions
const RAINBOW = [
  '#ff69b4','#ff6b6b','#ff4433','#ff5533','#ff7040',
  '#ffaa33','#ffcc00','#aacc44','#44bb44','#00ccaa',
  '#00ddff','#44aaff','#3388ff','#6655ff','#8844ff',
  '#aa44ff','#cc44ff','#ff44cc',
]

function sessionColor(index) {
  return RAINBOW[index % RAINBOW.length]
}

const SECTION_LABELS = [
  { k: 'decisions',  l: 'Canon Decisions / Locks' },
  { k: 'built',      l: 'Built / Fixed' },
  { k: 'completed',  l: 'Completed' },
  { k: 'flags',      l: 'Flags Raised' },
  { k: 'questions',  l: 'Open Questions' },
  { k: 'todo',       l: 'To-Do' },
  { k: 'notes',      l: 'Notes' },
]

const FEATURE_TAB_OPTIONS = [
  'dashboard','wiki','glossary','characters','familytree','world','locations','map',
  'manuscript','scenes','timeline','calendar',
  'inventory','flags','questions','canon','spellings',
  'notes','tools','sessionlog',
]

const FEATURE_REGISTRY_SEED = [
  { name: 'Wiki', tab: 'wiki', session: 1, status: 'active', description: 'Long-form lore articles with rich blocks (text, tables, callouts, images). The backbone of worldbuilding reference.' },
  { name: 'Characters', tab: 'characters', session: 1, status: 'active', description: 'Character cards with element filters, bubble colours, portrait upload, and crosslinks to Scenes.' },
  { name: 'Family Tree', tab: 'familytree', session: 1, status: 'active', description: 'Interactive canvas showing character relationships. Drag-to-reposition nodes, web and force-directed layout modes.' },
  { name: 'Scenes', tab: 'scenes', session: 1, status: 'active', description: 'Wrapped timeline of story scenes, grouped by chapter with gradient spectrum colours. Links to Manuscript chapters.' },
  { name: 'Timeline', tab: 'timeline', session: 1, status: 'active', description: 'Visual event track. XS = 8-column grid, XL = full-screen single column with auto-expand.' },
  { name: 'Calendar', tab: 'calendar', session: 1, status: 'active', description: 'Lajen 12-month calendar with day notes, birthdays, Expand All, and XS–XL grid sizing.' },
  { name: 'Flags', tab: 'flags', session: 1, status: 'active', description: 'Continuity flags for tracking unresolved story issues, inconsistencies, and reminders.' },
  { name: 'Questions', tab: 'questions', session: 1, status: 'active', description: 'Open canon questions — things not yet decided or confirmed for the series.' },
  { name: 'Canon', tab: 'canon', session: 1, status: 'active', description: 'Locked canon entries — confirmed facts about the world, characters, and story.' },
  { name: 'Notes', tab: 'notes', session: 1, status: 'active', description: 'Structured lore notes with popup view.' },
  { name: 'Journal', tab: 'journal', session: 1, status: 'active', description: 'Sticky-board quick capture. Cards with pin, size, and colour options.' },
  { name: 'Session Log', tab: 'sessionlog', session: 1, status: 'active', description: 'Session minutes cards — records of each working session with Claude.' },
  { name: 'Manuscript', tab: 'manuscript', session: 1, status: 'active', description: 'Book shelf → cover lightbox → TOC → chapter editor. Full writing and editing environment.' },
  { name: 'Activity Log', tab: 'sessionlog', session: 16, status: 'active', description: 'Automatic record of every add, edit, delete, import, and restore action taken in the Compendium. Includes undo.' },
  { name: 'Global Search', tab: 'dashboard', session: 20, status: 'active', description: 'Search bar in Dashboard header that searches across all tabs simultaneously.' },
  { name: 'Inventory', tab: 'inventory', session: 8, status: 'active', description: 'Item tracking in bubble, list, and outfit views. Drag to reorder. Transfer history. OutfitSnapshot inside.' },
  { name: 'Wardrobe', tab: 'wardrobe', session: 8, status: 'active', description: 'Character wardrobe entries with bubble colour popups.' },
  { name: 'Items', tab: 'items', session: 8, status: 'active', description: 'Standalone item entries separate from character inventory.' },
  { name: 'Locations', tab: 'locations', session: 1, status: 'active', description: 'Location entries with flat table view.' },
  { name: 'World', tab: 'world', session: 1, status: 'active', description: 'World-building entries covering geography, culture, politics, and lore.' },
  { name: 'Maps', tab: 'map', session: 1, status: 'active', description: 'Uploadable maps with zoom lightbox and drag-to-reorder.' },
  { name: 'Spellings', tab: 'spellings', session: 1, status: 'active', description: 'Canonical spelling reference for names, places, and terms series-wide.' },
  { name: 'Glossary', tab: 'glossary', session: 1, status: 'active', description: 'Filtered compact view of Wiki articles for quick reference.' },
  { name: 'Undo / Activity Tracking', tab: 'sessionlog', session: 25, status: 'active', description: 'The system that logs every Compendium action and enables one-click undo for any record.' },
  { name: 'Quick Capture', tab: 'dashboard', session: 14, status: 'active', description: 'Ctrl+Q shortcut to instantly capture a note or sticky without navigating away.' },
  { name: 'Partial Doomsday Export', tab: 'sessionlog', session: 25, status: 'active', description: 'Exports a subset of your data by category — a targeted backup rather than full export.' },
]

// ── Supabase helpers ───────────────────────────────────────────
async function sbLoadSessions() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase.from('session_log').select('*').order('session_number', { ascending: true })
    if (error) { console.warn('Session log load failed:', error.message); return null }
    return data || []
  } catch (e) { console.warn('Session log load failed:', e); return null }
}

async function sbUpsertSession(entry) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').upsert(entry, { onConflict: 'id' })
    if (error) console.warn('Session log upsert failed:', error.message)
  } catch (e) { console.warn('Session log upsert failed:', e) }
}

async function sbDeleteSession(id) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').delete().eq('id', id)
    if (error) console.warn('Session log delete failed:', error.message)
  } catch (e) { console.warn('Session log delete failed:', e) }
}

async function sbLoadFeatureRegistry() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase.from('feature_registry').select('*').order('created_at', { ascending: true })
    if (error) { console.warn('Feature registry load failed:', error.message); return null }
    return data || []
  } catch (e) { console.warn('Feature registry load failed:', e); return null }
}

async function sbUpsertFeatureRegistry(entries) {
  if (!hasSupabase || !entries?.length) return
  try {
    const { error } = await supabase.from('feature_registry').upsert(entries, { onConflict: 'id' })
    if (error) console.warn('Feature registry upsert failed:', error.message)
  } catch (e) { console.warn('Feature registry upsert failed:', e) }
}

const LS_KEY = 'gcomp_session_log'
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function lsSave(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {} }
const FR_LS_KEY = 'gcomp_feature_registry'
function lsLoadFeatureRegistry() { try { return JSON.parse(localStorage.getItem(FR_LS_KEY)) || [] } catch { return [] } }
function lsSaveFeatureRegistry(entries) { try { localStorage.setItem(FR_LS_KEY, JSON.stringify(entries)) } catch {} }

function sessionToMd(s) {
  const lines = [`# Session ${s.session_number} · ${s.date}`]
  if (s.opened_at || s.closed_at) lines.push(`\nOpened: ${s.opened_at || '—'} | Closed: ${s.closed_at || '—'}`)
  if (s.topics) lines.push(`\n**Topics:** ${s.topics}`)
  SECTION_LABELS.forEach(({ k, l }) => { if (s[k]?.trim()) lines.push(`\n## ${l}\n\n${s[k]}`) })
  lines.push('\n---')
  return lines.join('\n')
}

function emptySession(num) {
  return {
    id: uid(), session_number: num,
    date: new Date().toLocaleDateString('en-CA'),
    topics: '', opened_at: '', closed_at: '',
    decisions: '', built: '', completed: '',
    flags: '', questions: '', todo: '', notes: '',
  }
}

// ── Session card ───────────────────────────────────────────────
function SessionCard({ session, index, onEdit, onDelete, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const col = sessionColor(index)
  const hasContent = SECTION_LABELS.some(({ k }) => session[k]?.trim())

  return (
    <div style={{
      background: 'var(--card)',
      border: `1.5px solid ${col}`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <input type="checkbox" checked={selected} onClick={e => e.stopPropagation()}
          onChange={e => onSelect(e.target.checked)} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', fontWeight: 700, color: col }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 2 }}>{session.topics}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4, border: `1px solid ${col}66`, background: 'none', color: col, cursor: 'pointer' }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4, border: '1px solid #cc444466', background: 'none', color: '#cc4444', cursor: 'pointer' }}>✕</button>
          <span style={{ color: 'var(--dim)', fontSize: '1.08em' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && hasContent && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${col}22` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k]?.trim()) return null
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.77em', fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: '0.92em', color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{session[k]}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Session form ───────────────────────────────────────────────
function SessionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  const inputStyle = {
    width: '100%', padding: '6px 9px', borderRadius: 6,
    border: '1px solid var(--brd)', background: 'var(--sf)',
    color: 'var(--tx)', fontSize: '0.92em', outline: 'none', boxSizing: 'border-box',
  }
  const taStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: 'var(--cc)', marginBottom: 12, fontWeight: 700 }}>
        {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Session #</div>
          <input type="number" value={form.session_number} onChange={e => set('session_number', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Date</div>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Opened</div>
          <input value={form.opened_at} onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 9:43 AM CDT" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Closed</div>
          <input value={form.closed_at} onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 11:30 PM CDT" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Topics</div>
        <input value={form.topics} onChange={e => set('topics', e.target.value)} placeholder="Brief summary…" style={inputStyle} />
      </div>
      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>{l}</div>
          <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={`${l}…`} style={taStyle} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '0.92em' }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--cc)', color: '#000', cursor: 'pointer', fontSize: '0.92em', fontWeight: 700 }}>Save Session</button>
      </div>
    </div>
  )
}

// ── Activity Log sub-tab ───────────────────────────────────────
const ACTION_COLORS = {
  add:     '#44bb44',
  edit:    '#ffaa33',
  delete:  '#ff4444',
  import:  '#44aaff',
  restore: '#aa44ff',
}
const ACTION_LABELS = {
  add: '+ Added', edit: '✎ Edited', delete: '✕ Deleted',
  import: '⬆ Imported', restore: '⟲ Restored',
}

function ActivityLog({ activityLog, undoActivityRecord, crossLink }) {
  const [filterAction, setFilterAction] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedDiff, setExpandedDiff] = useState(null)

  const allActions = ['all', 'add', 'edit', 'delete', 'import', 'restore']
  const allCats = ['all', ...new Set((activityLog || []).map(r => r.table || r.category).filter(Boolean))]
  const formatRecordTimestamp = (timestamp) => {
    if (!timestamp) return '—'
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const filtered = (activityLog || []).filter(r => {
    if (filterAction !== 'all' && r.action !== filterAction) return false
    const cat = r.table || r.category
    if (filterCat !== 'all' && cat !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(r.entry_name || '').toLowerCase().includes(q) &&
          !(cat || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  function onRowClick(record) {
    if (record.recordId && record.table) {
      crossLink?.(record.table, record.recordId)
    }
  }

  if (!activityLog || activityLog.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)', fontStyle: 'italic', fontSize: '1em' }}>
        No activity yet. Actions like adds, edits, deletes, and imports will appear here.
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          style={{ flex: 1, minWidth: 140, padding: '5px 9px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {allActions.map(a => (
            <button key={a} onClick={() => setFilterAction(a)}
              style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                border: filterAction === a ? `1.5px solid ${ACTION_COLORS[a] || 'var(--cc)'}` : '1px solid var(--brd)',
                background: filterAction === a ? `${ACTION_COLORS[a] || 'var(--cc)'}22` : 'none',
                color: filterAction === a ? (ACTION_COLORS[a] || 'var(--cc)') : 'var(--dim)',
                fontWeight: filterAction === a ? 700 : 400 }}>
              {a === 'all' ? 'All' : ACTION_LABELS[a]}
            </button>
          ))}
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ fontSize: '0.85em', padding: '4px 7px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)' }}>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ fontSize: '0.85em', color: 'var(--mut)', marginBottom: 10 }}>
        {filtered.length} record{filtered.length !== 1 ? 's' : ''} · {(activityLog || []).length} total
      </div>

      {filtered.map(record => {
        const destCat = record.table || record.category || 'sessionlog'
        const rowColor = TAB_RAINBOW[destCat] || TAB_RAINBOW.sessionlog
        const actionIconColor = ACTION_COLORS[record.action] || 'var(--dim)'
        const isExpanded = expandedDiff === record.id
        return (
          <div key={record.id} onClick={() => onRowClick(record)} style={{
            background: 'var(--card)', border: `1px solid ${rowColor}33`,
            borderLeft: `3px solid ${rowColor}`, borderRadius: 8,
            marginBottom: 6, padding: '8px 12px',
            opacity: record.undone ? 0.5 : 1,
            cursor: record.recordId && record.table ? 'pointer' : 'default',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.77em', padding: '1px 6px', borderRadius: 4, border: `1px solid ${actionIconColor}66`, color: actionIconColor, marginRight: 8, fontWeight: 700, minWidth: 80, textAlign: 'center' }}>
                {ACTION_LABELS[record.action] || record.action}
              </span>
              <span style={{ fontSize: '1em', color: 'var(--tx)', flex: 1 }}>
                <span style={{ color: rowColor, fontSize: '0.8em' }}>{destCat} · </span>
                {record.entry_name}
              </span>
              <span style={{ fontSize: '0.8em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                {formatRecordTimestamp(record.timestamp)}
              </span>
              {record.diff && record.diff.length > 0 && (
                <button onClick={e => { e.stopPropagation(); setExpandedDiff(isExpanded ? null : record.id) }}
                  style={{ fontSize: '0.8em', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
                  {isExpanded ? 'Hide diff' : `${record.diff.length} change${record.diff.length !== 1 ? 's' : ''}`}
                </button>
              )}
              {!record.undone && (record.action === 'delete' || record.action === 'edit' || record.action === 'add') && (
                <button onClick={e => { e.stopPropagation(); undoActivityRecord(record.id) }}
                  style={{ fontSize: '0.8em', padding: '2px 8px', borderRadius: 4, border: `1px solid ${actionIconColor}55`, background: 'none', color: actionIconColor, cursor: 'pointer', fontWeight: 700 }}>
                  ⟲ Undo
                </button>
              )}
              {record.undone && (
                <span style={{ fontSize: '0.8em', color: 'var(--mut)', fontStyle: 'italic' }}>undone</span>
              )}
            </div>
            {/* Diff view */}
            {isExpanded && record.diff && (
              <div style={{ marginTop: 8, background: 'var(--sf)', borderRadius: 6, padding: 8, fontSize: '0.85em' }}>
                {record.diff.map((d, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ color: 'var(--dim)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', fontSize: '0.8em' }}>{d.field}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 4, padding: '4px 6px', color: '#ff8888' }}>
                        <span style={{ fontSize: '0.75em', display: 'block', marginBottom: 2, opacity: 0.7 }}>Before</span>
                        {String(d.before || '—').slice(0, 200)}
                      </div>
                      <div style={{ background: '#44bb4411', border: '1px solid #44bb4433', borderRadius: 4, padding: '4px 6px', color: '#88ff88' }}>
                        <span style={{ fontSize: '0.75em', display: 'block', marginBottom: 2, opacity: 0.7 }}>After</span>
                        {String(d.after || '—').slice(0, 200)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main SessionLog tab ────────────────────────────────────────
export default function SessionLog({ db, goTo, crossLink }) {
  const [sessions, setSessions] = useState([])
  const [featureRegistry, setFeatureRegistry] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addingFeature, setAddingFeature] = useState(false)
  const [editingDescriptions, setEditingDescriptions] = useState(false)
  const [featureForm, setFeatureForm] = useState({ name: '', tab: 'dashboard', session: 1, description: '' })
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [subTab, setSubTab] = useState('sessions')

  function flash(text, ms = 3000) { setMsg(text); setTimeout(() => setMsg(''), ms) }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const local = lsLoad()
      setSessions(local)
      if (hasSupabase) {
        const remote = await sbLoadSessions()
        if (remote !== null) { setSessions(remote); lsSave(remote) }
      }
      const localFeatures = lsLoadFeatureRegistry()
      let loadedFeatures = localFeatures
      if (hasSupabase) {
        const remoteFeatures = await sbLoadFeatureRegistry()
        if (remoteFeatures) loadedFeatures = remoteFeatures
      }
      if (!loadedFeatures.length) {
        loadedFeatures = FEATURE_REGISTRY_SEED.map(entry => ({ ...entry, id: uid() }))
        await sbUpsertFeatureRegistry(loadedFeatures)
      }
      setFeatureRegistry(loadedFeatures)
      lsSaveFeatureRegistry(loadedFeatures)
      setLoading(false)
    }
    load()
  }, [])

  async function saveSession(form) {
    const entry = { ...form, session_number: Number(form.session_number) }
    const updated = sessions.find(s => s.id === entry.id)
      ? sessions.map(s => s.id === entry.id ? entry : s)
      : [...sessions, entry].sort((a, b) => a.session_number - b.session_number)
    setSessions(updated)
    lsSave(updated)
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

  function exportSelected() {
    const toExport = sessions.filter(s => selected.has(s.id)).sort((a, b) => a.session_number - b.session_number)
    if (!toExport.length) { flash('No sessions selected.'); return }
    const body = toExport.map(sessionToMd).join('\n\n')
    const blob = new Blob([`# The Guardians of Lajen — Session Log\n\n---\n\n${body}`], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = toExport.length === 1 ? `session_${toExport[0].session_number}_${toExport[0].date}.md` : `guardians_sessions_export_${new Date().toISOString().slice(0,10)}.md`
    a.click(); flash(`Exported ${toExport.length} session${toExport.length > 1 ? 's' : ''}.`)
  }

  function exportAll() {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number)
    if (!sorted.length) { flash('No sessions to export.'); return }
    const body = sorted.map(sessionToMd).join('\n\n')
    const blob = new Blob([`# The Guardians of Lajen — Complete Session Log\n\n*Sahrynar (Melissa) & Claude · Exported ${new Date().toLocaleDateString()}*\n\n---\n\n${body}`], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_session_log_complete_${new Date().toISOString().slice(0,10)}.md`
    a.click(); flash(`Exported all ${sorted.length} sessions.`)
  }

  async function saveFeatureRegistry(nextEntries) {
    setFeatureRegistry(nextEntries)
    lsSaveFeatureRegistry(nextEntries)
    await sbUpsertFeatureRegistry(nextEntries)
  }

  async function toggleFeatureArchive(id) {
    const next = featureRegistry.map(entry => {
      if (entry.id !== id) return entry
      return { ...entry, status: entry.status === 'archived' ? 'active' : 'archived' }
    })
    await saveFeatureRegistry(next)
  }

  async function addFeature() {
    const name = featureForm.name.trim()
    if (!name) return
    const sessionNum = Number(featureForm.session)
    const next = [...featureRegistry, {
      id: uid(),
      name,
      tab: featureForm.tab,
      session: Number.isFinite(sessionNum) ? sessionNum : 1,
      description: featureForm.description || '',
      status: 'active',
    }]
    await saveFeatureRegistry(next)
    setFeatureForm({ name: '', tab: 'dashboard', session: 1, description: '' })
    setAddingFeature(false)
  }

  async function toggleDescriptionEditing() {
    if (editingDescriptions) {
      await saveFeatureRegistry(featureRegistry)
    }
    setEditingDescriptions(prev => !prev)
  }

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase()
    return !q || [s.topics, s.decisions, s.built, s.notes, s.questions, s.flags, s.todo, s.completed]
      .some(f => f && f.toLowerCase().includes(q))
  })
  const nextNum = sessions.length ? Math.max(...sessions.map(s => Number(s.session_number))) + 1 : 1

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontFamily: "'Cinzel',serif" }}>
      Loading session log…
    </div>
  )

  // Tab color for SessionLog is the last in the rainbow
  const tabColor = TAB_RAINBOW.sessionlog || '#ff44cc'

  return (
    <div>
      {/* Header */}
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: tabColor, marginBottom: 12 }}>
        📋 Logs
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ fontSize: '0.92em', color: 'var(--sl)', marginBottom: 10, padding: '6px 12px', background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>{msg}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setSubTab('sessions')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${subTab === 'sessions' ? tabColor : 'var(--brd)'}`,
            background: subTab === 'sessions' ? tabColor : 'transparent',
            color: subTab === 'sessions' ? '#000' : tabColor,
            fontSize: '0.85em',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Session Logs
        </button>
        <button
          onClick={() => setSubTab('activityfeatures')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${subTab === 'activityfeatures' ? tabColor : 'var(--brd)'}`,
            background: subTab === 'activityfeatures' ? tabColor : 'transparent',
            color: subTab === 'activityfeatures' ? '#000' : tabColor,
            fontSize: '0.85em',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Activity & Features
        </button>
      </div>

      {subTab === 'sessions' ? (
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
              style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '0.92em', outline: 'none' }} />
            {selected.size > 0 && (
              <>
                <button onClick={exportSelected} style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: `1px solid ${tabColor}`, background: 'none', color: tabColor, cursor: 'pointer' }}>
                  ↓ Export {selected.size} selected
                </button>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: '0.85em', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>Clear</button>
              </>
            )}
            {filtered.length > 0 && (
              <button onClick={() => setSelected(new Set(filtered.map(s => s.id)))}
                style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>Select all</button>
            )}
            <button onClick={exportAll} style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>↓ Export All</button>
            <button onClick={() => { setAdding(true); setEditing(null) }}
              style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8, border: 'none', background: tabColor, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
              + New Session
            </button>
          </div>

          {adding && <SessionForm initial={emptySession(nextNum)} onSave={saveSession} onCancel={() => setAdding(false)} />}
          {editing && <SessionForm initial={editing} onSave={saveSession} onCancel={() => setEditing(null)} />}

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)', fontStyle: 'italic', fontSize: '1em' }}>
              {sessions.length === 0 ? 'No sessions yet. Add your first one!' : 'No sessions match this search.'}
            </div>
          ) : (
            filtered.map((s, i) => (
              <SessionCard
                key={s.id} session={s} index={i}
                onEdit={s => { setEditing(s); setAdding(false) }}
                onDelete={deleteSession}
                selected={selected.has(s.id)}
                onSelect={checked => toggleSelect(s.id, checked)}
              />
            ))
          )}
          <div style={{ fontSize: '0.85em', color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
            {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Cloud sync on' : 'Local only'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 50%', minWidth: 0, paddingRight: 14 }}>
            <ActivityLog
              activityLog={db?.activityLog || []}
              undoActivityRecord={db?.undoActivityRecord}
              crossLink={crossLink}
            />
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--brd)', flexShrink: 0 }} />

          <div style={{ flex: '0 0 50%', minWidth: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', minHeight: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: '1em', fontWeight: 700, color: tabColor, fontFamily: "'Cinzel',serif" }}>âš™ Features</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setAddingFeature(v => !v)}
                  style={{ fontSize: '0.85em', padding: '3px 9px', borderRadius: 8, border: `1px solid ${tabColor}66`, background: 'none', color: tabColor, cursor: 'pointer', fontWeight: 700 }}
                >
                  + Add Feature
                </button>
                <button
                  onClick={toggleDescriptionEditing}
                  style={{ fontSize: '0.85em', padding: '3px 9px', borderRadius: 8, border: `1px solid ${tabColor}66`, background: editingDescriptions ? `${tabColor}22` : 'none', color: tabColor, cursor: 'pointer', fontWeight: 700 }}
                >
                  ✎ Edit
                </button>
              </div>
            </div>

            {addingFeature && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr auto', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    value={featureForm.name}
                    onChange={e => setFeatureForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Feature name"
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em', outline: 'none' }}
                  />
                  <select
                    value={featureForm.tab}
                    onChange={e => setFeatureForm(f => ({ ...f, tab: e.target.value }))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em' }}
                  >
                    {FEATURE_TAB_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={featureForm.session}
                    onChange={e => setFeatureForm(f => ({ ...f, session: e.target.value }))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em', outline: 'none' }}
                  />
                  <button
                    onClick={addFeature}
                    style={{ fontSize: '0.85em', padding: '5px 9px', borderRadius: 6, border: 'none', background: tabColor, color: '#000', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Save
                  </button>
                </div>
                <textarea
                  value={featureForm.description}
                  onChange={e => setFeatureForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Feature description"
                  style={{ width: '100%', minHeight: 50, resize: 'vertical', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ overflowY: 'auto', paddingRight: 2 }}>
              {featureRegistry.map(entry => {
                const archived = entry.status === 'archived'
                const featureColor = TAB_RAINBOW[entry.tab] || tabColor
                return (
                  <div key={entry.id} onClick={() => goTo?.(entry.tab)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '1em',
                    padding: '5px 8px',
                    marginBottom: 4,
                    borderRadius: 6,
                    background: 'var(--card)',
                    border: `1px solid ${featureColor}33`,
                    borderLeft: `3px solid ${featureColor}`,
                    opacity: archived ? 0.55 : 1,
                    textDecoration: archived ? 'line-through' : 'none',
                    cursor: 'pointer',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'var(--tx)', whiteSpace: 'normal' }}>
                        {entry.name}
                        {entry.description ? ` — ${entry.description}` : ''}
                      </span>
                      {editingDescriptions && (
                        <input
                          value={entry.description || ''}
                          onChange={e => setFeatureRegistry(prev => prev.map(item => item.id === entry.id ? { ...item, description: e.target.value } : item))}
                          placeholder="Description"
                          style={{ width: '100%', marginTop: 4, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: '1em', outline: 'none' }}
                        />
                      )}
                      <span style={{ display: 'block', marginTop: 2, fontSize: '0.8em', color: 'var(--dim)' }}>
                        ({entry.tab} · S{entry.session})
                      </span>
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); goTo?.(entry.tab) }}
                      title={`Go to ${entry.tab}`}
                      style={{ fontSize: '0.85em', padding: '1px 5px', borderRadius: 4, border: `1px solid ${featureColor}55`, background: 'none', color: featureColor, cursor: 'pointer' }}
                    >
                      ↗
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleFeatureArchive(entry.id) }}
                      title={archived ? 'Restore to active' : 'Archive feature'}
                      style={{ fontSize: '1em', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}
                    >
                      📦
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



