import { useState, useEffect } from 'react'
import { uid } from '../constants'
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
  'manuscript','scenes','timeline','eras','calendar',
  'inventory','wardrobe','items','flags','questions','canon','spellings',
  'notes','journal','tools','sessionlog',
]

const FEATURE_REGISTRY_SEED = [
  { name: 'Wiki', tab: 'wiki', session: 1, status: 'active' },
  { name: 'Characters', tab: 'characters', session: 1, status: 'active' },
  { name: 'Family Tree', tab: 'familytree', session: 1, status: 'active' },
  { name: 'Scenes', tab: 'scenes', session: 1, status: 'active' },
  { name: 'Timeline', tab: 'timeline', session: 1, status: 'active' },
  { name: 'Calendar', tab: 'calendar', session: 1, status: 'active' },
  { name: 'Flags', tab: 'flags', session: 1, status: 'active' },
  { name: 'Questions', tab: 'questions', session: 1, status: 'active' },
  { name: 'Canon', tab: 'canon', session: 1, status: 'active' },
  { name: 'Notes', tab: 'notes', session: 1, status: 'active' },
  { name: 'Journal', tab: 'journal', session: 1, status: 'active' },
  { name: 'Session Log', tab: 'sessionlog', session: 1, status: 'active' },
  { name: 'Manuscript', tab: 'manuscript', session: 1, status: 'active' },
  { name: 'Activity Log', tab: 'sessionlog', session: 16, status: 'active' },
  { name: 'Global Search', tab: 'dashboard', session: 20, status: 'active' },
  { name: 'Inventory', tab: 'inventory', session: 8, status: 'active' },
  { name: 'Wardrobe', tab: 'wardrobe', session: 8, status: 'active' },
  { name: 'Items', tab: 'items', session: 8, status: 'active' },
  { name: 'Locations', tab: 'locations', session: 1, status: 'active' },
  { name: 'World', tab: 'world', session: 1, status: 'active' },
  { name: 'Maps', tab: 'map', session: 1, status: 'active' },
  { name: 'Spellings', tab: 'spellings', session: 1, status: 'active' },
  { name: 'Glossary', tab: 'glossary', session: 1, status: 'active' },
  { name: 'Undo / Activity Tracking', tab: 'sessionlog', session: 25, status: 'active' },
  { name: 'Quick Capture', tab: 'dashboard', session: 14, status: 'active' },
  { name: 'Partial Doomsday Export', tab: 'sessionlog', session: 25, status: 'active' },
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
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: col }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{session.topics}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${col}66`, background: 'none', color: col, cursor: 'pointer' }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #cc444466', background: 'none', color: '#cc4444', cursor: 'pointer' }}>✕</button>
          <span style={{ color: 'var(--dim)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && hasContent && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${col}22` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k]?.trim()) return null
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 12, color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{session[k]}</div>
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
    color: 'var(--tx)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }
  const taStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: 'var(--cc)', marginBottom: 12, fontWeight: 700 }}>
        {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Session #</div>
          <input type="number" value={form.session_number} onChange={e => set('session_number', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Date</div>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Opened</div>
          <input value={form.opened_at} onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 9:43 AM CDT" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Closed</div>
          <input value={form.closed_at} onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 11:30 PM CDT" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Topics</div>
        <input value={form.topics} onChange={e => set('topics', e.target.value)} placeholder="Brief summary…" style={inputStyle} />
      </div>
      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>{l}</div>
          <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={`${l}…`} style={taStyle} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--cc)', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save Session</button>
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

function ActivityLog({ activityLog, undoActivityRecord }) {
  const [filterAction, setFilterAction] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedDiff, setExpandedDiff] = useState(null)

  const allActions = ['all', 'add', 'edit', 'delete', 'import', 'restore']
  const allCats = ['all', ...new Set((activityLog || []).map(r => r.category).filter(Boolean))]

  const filtered = (activityLog || []).filter(r => {
    if (filterAction !== 'all' && r.action !== filterAction) return false
    if (filterCat !== 'all' && r.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(r.entry_name || '').toLowerCase().includes(q) &&
          !(r.category || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  if (!activityLog || activityLog.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)', fontStyle: 'italic', fontSize: 13 }}>
        No activity yet. Actions like adds, edits, deletes, and imports will appear here.
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          style={{ flex: 1, minWidth: 140, padding: '5px 9px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 11, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {allActions.map(a => (
            <button key={a} onClick={() => setFilterAction(a)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, cursor: 'pointer',
                border: filterAction === a ? `1.5px solid ${ACTION_COLORS[a] || 'var(--cc)'}` : '1px solid var(--brd)',
                background: filterAction === a ? `${ACTION_COLORS[a] || 'var(--cc)'}22` : 'none',
                color: filterAction === a ? (ACTION_COLORS[a] || 'var(--cc)') : 'var(--dim)',
                fontWeight: filterAction === a ? 700 : 400 }}>
              {a === 'all' ? 'All' : ACTION_LABELS[a]}
            </button>
          ))}
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ fontSize: 10, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--dim)' }}>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 10 }}>
        {filtered.length} record{filtered.length !== 1 ? 's' : ''} · {(activityLog || []).length} total
      </div>

      {filtered.map(record => {
        const col = ACTION_COLORS[record.action] || 'var(--dim)'
        const isExpanded = expandedDiff === record.id
        return (
          <div key={record.id} style={{
            background: 'var(--card)', border: `1px solid ${col}33`,
            borderLeft: `3px solid ${col}`, borderRadius: 8,
            marginBottom: 6, padding: '8px 12px',
            opacity: record.undone ? 0.5 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: col, minWidth: 80 }}>
                {ACTION_LABELS[record.action] || record.action}
              </span>
              <span style={{ fontSize: 11, color: 'var(--tx)', flex: 1 }}>
                <span style={{ color: 'var(--dim)', fontSize: 9 }}>{record.category} · </span>
                {record.entry_name}
              </span>
              <span style={{ fontSize: 9, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                {new Date(record.timestamp).toLocaleString()}
              </span>
              {record.diff && record.diff.length > 0 && (
                <button onClick={() => setExpandedDiff(isExpanded ? null : record.id)}
                  style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
                  {isExpanded ? 'Hide diff' : `${record.diff.length} change${record.diff.length !== 1 ? 's' : ''}`}
                </button>
              )}
              {!record.undone && (record.action === 'delete' || record.action === 'edit' || record.action === 'add') && (
                <button onClick={() => undoActivityRecord(record.id)}
                  style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, border: `1px solid ${col}55`, background: 'none', color: col, cursor: 'pointer', fontWeight: 700 }}>
                  ⟲ Undo
                </button>
              )}
              {record.undone && (
                <span style={{ fontSize: 9, color: 'var(--mut)', fontStyle: 'italic' }}>undone</span>
              )}
            </div>
            {/* Diff view */}
            {isExpanded && record.diff && (
              <div style={{ marginTop: 8, background: 'var(--sf)', borderRadius: 6, padding: 8, fontSize: 10 }}>
                {record.diff.map((d, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ color: 'var(--dim)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', fontSize: 9 }}>{d.field}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 4, padding: '4px 6px', color: '#ff8888' }}>
                        <span style={{ fontSize: 8, display: 'block', marginBottom: 2, opacity: 0.7 }}>Before</span>
                        {String(d.before || '—').slice(0, 200)}
                      </div>
                      <div style={{ background: '#44bb4411', border: '1px solid #44bb4433', borderRadius: 4, padding: '4px 6px', color: '#88ff88' }}>
                        <span style={{ fontSize: 8, display: 'block', marginBottom: 2, opacity: 0.7 }}>After</span>
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
export default function SessionLog({ db, goTo }) {
  const [sessions, setSessions] = useState([])
  const [featureRegistry, setFeatureRegistry] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addingFeature, setAddingFeature] = useState(false)
  const [featureForm, setFeatureForm] = useState({ name: '', tab: 'dashboard', session: 1 })
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
        if (remote) { setSessions(remote); lsSave(remote) }
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
      status: 'active',
    }]
    await saveFeatureRegistry(next)
    setFeatureForm({ name: '', tab: 'dashboard', session: 1 })
    setAddingFeature(false)
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
  const tabColor = '#ff44cc'

  return (
    <div>
      {/* Header */}
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: tabColor, marginBottom: 12 }}>
        📋 Session Log
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ fontSize: 12, color: 'var(--sl)', marginBottom: 10, padding: '6px 12px', background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>{msg}</div>
      )}

      {/* Side-by-side layout: Sessions (60%) | Right panel (40%) */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

        {/* Left panel — Sessions */}
        <div style={{ flex: '0 0 60%', minWidth: 0, paddingRight: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: tabColor, marginBottom: 10, fontFamily: "'Cinzel',serif" }}>📋 Sessions</div>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
              style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, outline: 'none' }} />
            {selected.size > 0 && (
              <>
                <button onClick={exportSelected} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: `1px solid ${tabColor}`, background: 'none', color: tabColor, cursor: 'pointer' }}>
                  ↓ Export {selected.size} selected
                </button>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>Clear</button>
              </>
            )}
            {filtered.length > 0 && (
              <button onClick={() => setSelected(new Set(filtered.map(s => s.id)))}
                style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>Select all</button>
            )}
            <button onClick={exportAll} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>↓ Export All</button>
            <button onClick={() => { setAdding(true); setEditing(null) }}
              style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', background: tabColor, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
              + New Session
            </button>
          </div>

          {adding && <SessionForm initial={emptySession(nextNum)} onSave={saveSession} onCancel={() => setAdding(false)} />}
          {editing && <SessionForm initial={editing} onSave={saveSession} onCancel={() => setEditing(null)} />}

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)', fontStyle: 'italic', fontSize: 13 }}>
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
          <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
            {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Cloud sync on' : 'Local only'}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--brd)', flexShrink: 0 }} />

        {/* Right panel — Features + Activity Log */}
        <div style={{ flex: '0 0 40%', minWidth: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', minHeight: 540 }}>
          <div style={{ flex: '0 0 55%', minHeight: 260, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tabColor, fontFamily: "'Cinzel',serif" }}>⚙ Features</div>
              <button
                onClick={() => setAddingFeature(v => !v)}
                style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, border: `1px solid ${tabColor}66`, background: 'none', color: tabColor, cursor: 'pointer', fontWeight: 700 }}
              >
                + Add Feature
              </button>
            </div>

            {addingFeature && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr auto', gap: 6, alignItems: 'center' }}>
                  <input
                    value={featureForm.name}
                    onChange={e => setFeatureForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Feature name"
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 11, outline: 'none' }}
                  />
                  <select
                    value={featureForm.tab}
                    onChange={e => setFeatureForm(f => ({ ...f, tab: e.target.value }))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 11 }}
                  >
                    {FEATURE_TAB_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={featureForm.session}
                    onChange={e => setFeatureForm(f => ({ ...f, session: e.target.value }))}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 11, outline: 'none' }}
                  />
                  <button
                    onClick={addFeature}
                    style={{ fontSize: 10, padding: '5px 9px', borderRadius: 6, border: 'none', background: tabColor, color: '#000', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div style={{ overflowY: 'auto', paddingRight: 2 }}>
              {featureRegistry.map(entry => {
                const archived = entry.status === 'archived'
                return (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    padding: '5px 8px',
                    marginBottom: 4,
                    borderRadius: 6,
                    background: 'var(--card)',
                    border: '1px solid var(--brd)',
                    opacity: archived ? 0.55 : 1,
                    textDecoration: archived ? 'line-through' : 'none',
                  }}>
                    <span style={{ flex: 1 }}>
                      {entry.name}
                      <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--dim)' }}>
                        ({entry.tab} · S{entry.session})
                      </span>
                    </span>
                    <button
                      onClick={() => goTo?.(entry.tab)}
                      title={`Go to ${entry.tab}`}
                      style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: `1px solid ${tabColor}55`, background: 'none', color: tabColor, cursor: 'pointer' }}
                    >
                      ↗
                    </button>
                    <button
                      onClick={() => toggleFeatureArchive(entry.id)}
                      title={archived ? 'Restore to active' : 'Archive feature'}
                      style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}
                    >
                      📦
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--brd)', margin: '10px 0' }} />

          <div style={{ flex: '0 0 45%', minHeight: 220, overflowY: 'auto' }}>
            <ActivityLog
              activityLog={db?.activityLog || []}
              undoActivityRecord={db?.undoActivityRecord}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
