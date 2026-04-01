import { useState, useEffect, useMemo } from 'react'
import { uid, CATS } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Element color palette ──────────────────────────────────────
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
    if (error) {
      // Table or column doesn't exist — fall back to localStorage
      console.warn('Session log table not available:', error.message)
      return null
    }
    return data || []
  } catch (e) {
    console.warn('Session log load failed:', e)
    return null
  }
}

async function sbUpsertSession(entry) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase
      .from('session_log')
      .upsert(entry, { onConflict: 'id' })
    if (error) console.warn('Session log upsert skipped:', error.message)
  } catch (e) {
    console.warn('Session log upsert failed:', e)
  }
}

async function sbDeleteSession(id) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase
      .from('session_log')
      .delete()
      .eq('id', id)
    if (error) console.warn('Session log delete skipped:', error.message)
  } catch (e) {
    console.warn('Session log delete failed:', e)
  }
}

// ── Local storage fallback ─────────────────────────────────────
const LS_KEY = 'gcomp_session_log'
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}
function lsSave(sessions) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(sessions)) } catch {}
}

// ── Format a session as markdown ──────────────────────────────
function sessionToMd(s) {
  const lines = []
  lines.push(`# Session ${s.session_number} · ${s.date}`)
  if (s.element && s.element !== 'Mixed') lines.push(`*Element: ${s.element}*`)
  if (s.topics) lines.push(`\n**Topics:** ${s.topics}`)
  if (s.opened_at || s.closed_at) {
    lines.push(`\nOpened: ${s.opened_at || '—'} | Closed: ${s.closed_at || '—'}`)
  }
  SECTION_LABELS.forEach(({ k, l }) => {
    if (s[k] && s[k].trim()) {
      lines.push(`\n## ${l}\n\n${s[k]}`)
    }
  })
  lines.push('\n---')
  return lines.join('\n')
}

// ── Empty session template ─────────────────────────────────────
function emptySession(num) {
  return {
    id: uid(),
    session_number: num,
    date: new Date().toLocaleDateString('en-CA'),
    element: 'Mixed',
    topics: '',
    opened_at: '',
    closed_at: '',
    decisions: '',
    built: '',
    completed: '',
    flags: '',
    questions: '',
    todo: '',
    notes: '',
  }
}

// ── Session card (view mode) ───────────────────────────────────
function SessionCard({ session, onEdit, onDelete, selected, onSelect, fontSize = 12 }) {
  const [expanded, setExpanded] = useState(false)
  const col = ELEMENT_COLORS[session.element] || ELEMENT_COLORS.Mixed
  const hasContent = SECTION_LABELS.some(({ k }) => session[k] && session[k].trim())

  return (
    <div style={{
      background: col.bg,
      border: `1.5px solid ${col.border}`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <input
          type="checkbox"
          checked={selected}
          onClick={e => e.stopPropagation()}
          onChange={e => onSelect(e.target.checked)}
          style={{ flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: fontSize + 1, fontWeight: 700, color: col.text }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: fontSize - 1, color: col.text, opacity: 0.75, marginTop: 2 }}>
              {session.topics}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${col.border}`, background: 'none', color: col.text, cursor: 'pointer' }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #cc4444', background: 'none', color: '#cc4444', cursor: 'pointer' }}
          >✕</button>
          <span style={{ color: col.text, fontSize: 14, opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && hasContent && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${col.border}33` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k] || !session[k].trim()) return null
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div style={{ fontSize: fontSize - 2, fontWeight: 700, color: col.text, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: fontSize, color: col.text, whiteSpace: 'pre-wrap', lineHeight: 1.6, opacity: 0.9 }}>{session[k]}</div>
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
    color: 'var(--tx)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }
  const taStyle = { ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

  return (
    <div style={{
      background: col.bg, border: `2px solid ${col.border}`,
      borderRadius: 12, padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: col.text, fontWeight: 700 }}>
          {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
        </div>
        <button onClick={onCancel}
          style={{ background: 'none', border: 'none', color: col.text, cursor: 'pointer',
            fontSize: 18, opacity: 0.6, padding: '0 4px', lineHeight: 1 }}
          title="Close">✕</button>
      </div>

      {/* Top row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Session #</div>
          <input type="number" value={form.session_number} onChange={e => set('session_number', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Date</div>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Element</div>
          <select value={form.element} onChange={e => set('element', e.target.value)} style={inputStyle}>
            {ELEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Opened</div>
          <input value={form.opened_at} onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 9:43 AM CDT" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Closed</div>
          <input value={form.closed_at} onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 11:30 PM CDT" style={inputStyle} />
        </div>
      </div>

      {/* Topics */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Topics (brief summary line)</div>
        <input value={form.topics} onChange={e => set('topics', e.target.value)} placeholder="e.g. Session Log tab · Journal migration · Aster import expansion" style={inputStyle} />
      </div>

      {/* Sections */}
      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: col.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
          <textarea
            value={form[k]}
            onChange={e => set(k, e.target.value)}
            placeholder={`${l}…`}
            style={taStyle}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: col.border, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save Session</button>
      </div>
    </div>
  )
}

// ── Main SessionLog tab ────────────────────────────────────────
export default function SessionLog({ db }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [filterEl, setFilterEl] = useState('All')
  const [fontSize, setFontSize] = useState(12)
  const [activeView, setActiveView] = useState('sessions') // 'sessions' | 'activity'

  function flash(text, ms = 2500) {
    setMsg(text)
    setTimeout(() => setMsg(''), ms)
  }

  // Load on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const local = lsLoad()
      setSessions(local)
      if (hasSupabase) {
        const remote = await sbLoadSessions()
        if (remote) {
          setSessions(remote)
          lsSave(remote)
        }
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
    setSessions(updated)
    lsSave(updated)
    await sbUpsertSession(entry)
    setEditing(null)
    setAdding(false)
    flash('Session saved.')
  }

  async function deleteSession(id) {
    if (!confirm('Delete this session entry?')) return
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    lsSave(updated)
    await sbDeleteSession(id)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    flash('Session deleted.')
  }

  function toggleSelect(id, checked) {
    setSelected(prev => {
      const n = new Set(prev)
      checked ? n.add(id) : n.delete(id)
      return n
    })
  }

  function selectAll() {
    const visible = filtered.map(s => s.id)
    setSelected(new Set(visible))
  }

  function clearSelection() { setSelected(new Set()) }

  function exportSelected() {
    const toExport = sessions
      .filter(s => selected.has(s.id))
      .sort((a, b) => a.session_number - b.session_number)
    if (!toExport.length) { flash('No sessions selected.'); return }
    const header = `# The Guardians of Lajen — Session Log\n\n*Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const body = toExport.map(sessionToMd).join('\n\n')
    const blob = new Blob([header + body], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = toExport.length === 1
      ? `session_${toExport[0].session_number}_${toExport[0].date}.md`
      : `guardians_sessions_export_${new Date().toISOString().slice(0,10)}.md`
    a.click()
    flash(`Exported ${toExport.length} session${toExport.length > 1 ? 's' : ''}.`)
  }

  function exportAll() {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number)
    if (!sorted.length) { flash('No sessions to export.'); return }
    const header = `# The Guardians of Lajen — Complete Session Log\n\n*Sahrynar (Melissa) & Claude · Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const body = sorted.map(sessionToMd).join('\n\n')
    const blob = new Blob([header + body], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `guardians_session_log_complete_${new Date().toISOString().slice(0,10)}.md`
    a.click()
    flash(`Exported all ${sorted.length} sessions.`)
  }

  // Filter
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
        {[['sessions','📋 Sessions'],['activity','⚡ Activity Log']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveView(v)}
            style={{ fontSize: 11, padding: '4px 14px', borderRadius: 16, fontWeight: 600,
              background: activeView === v ? 'var(--cc)' : 'var(--card)',
              color: activeView === v ? '#000' : 'var(--dim)',
              border: `1px solid ${activeView === v ? 'var(--cc)' : 'var(--brd)'}`,
              cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* ── Activity Log view ── */}
      {activeView === 'activity' && (
        <ActivityLog db={db} />
      )}

      {/* ── Sessions view ── */}
      {activeView === 'sessions' && (<>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: 'var(--cc)' }}>
          📋 Session Log
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Font size controls */}
          <div style={{ display:'flex', gap:2, alignItems:'center', marginRight: 4 }}>
            <button onClick={() => setFontSize(s => Math.max(9, s - 1))}
              style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'none',
                border:'1px solid var(--brd)', color:'var(--dim)', cursor:'pointer' }}>A−</button>
            <button onClick={() => setFontSize(s => Math.min(18, s + 1))}
              style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'none',
                border:'1px solid var(--brd)', color:'var(--dim)', cursor:'pointer' }}>A+</button>
          </div>
          {selected.size > 0 && (
            <>
              <button onClick={exportSelected} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid var(--cc)', background: 'none', color: 'var(--cc)', cursor: 'pointer' }}>
                ↓ Export {selected.size} selected
              </button>
              <button onClick={clearSelection} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
                Clear
              </button>
            </>
          )}
          <button onClick={exportAll} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            ↓ Export All
          </button>
          <button
            onClick={() => { setAdding(true); setEditing(null) }}
            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, border: 'none', background: 'var(--cc)', color: '#000', cursor: 'pointer', fontWeight: 700 }}
          >
            + New Session
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ fontSize: 12, color: 'var(--cc)', marginBottom: 10, padding: '6px 12px', background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions…"
          style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
        />
        {filtered.length > 0 && (
          <button onClick={selectAll} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            Select all visible
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <SessionForm
          initial={emptySession(nextNum)}
          onSave={saveSession}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Edit form */}
      {editing && (
        <SessionForm
          initial={editing}
          onSave={saveSession}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Session list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontStyle: 'italic', fontSize: 13 }}>
          {sessions.length === 0 ? 'No sessions yet. Add your first one!' : 'No sessions match this filter.'}
        </div>
      ) : (
        filtered.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            onEdit={s => { setEditing(s); setAdding(false) }}
            onDelete={deleteSession}
            selected={selected.has(s.id)}
            onSelect={checked => toggleSelect(s.id, checked)}
            fontSize={fontSize}
          />
        ))
      )}

      <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Synced to cloud' : 'Local only'}
      </div>
      </>)}
    </div>
  )
}

// ── Activity Log component ────────────────────────────────────────
function ActivityLog({ db }) {
  const [filterCat, setFilterCat] = useState('all')
  const [limit, setLimit] = useState(50)

  // Gather all entries with updated_at or created fields, sort by recency
  const allActivity = useMemo(() => {
    if (!db?.db) return []
    const items = []
    const skip = new Set(['family_tree','settings','session_log'])
    Object.entries(db.db).forEach(([cat, entries]) => {
      if (skip.has(cat) || !Array.isArray(entries)) return
      entries.forEach(e => {
        const ts = e.updated_at || e.updated || e.created || null
        if (!ts) return
        items.push({
          id: e.id,
          cat,
          name: e.name || e.title || e.display_name || e.word || e.chapter_num || '(unnamed)',
          ts,
          status: e.status || null,
        })
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
    <div className="empty">
      <div className="empty-icon">⚡</div>
      <p>No activity yet — entries with timestamps will appear here.</p>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--mut)', marginBottom: 10 }}>
        Showing entries with edit timestamps, newest first.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {cats.map(c => {
          const cat = CATS?.[c]
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                background: filterCat === c ? (cat?.c || 'var(--cc)') : 'none',
                color: filterCat === c ? '#000' : 'var(--dim)',
                border: `1px solid ${filterCat === c ? (cat?.c || 'var(--cc)') : 'var(--brd)'}` }}>
              {c === 'all' ? 'All' : (cat?.i ? `${cat.i} ${cat.l}` : c)}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.slice(0, limit).map((a, i) => {
          const d = new Date(a.ts)
          const dateStr = isNaN(d) ? a.ts : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const timeStr = isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={a.id + i} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 10px', background: i % 2 === 0 ? 'var(--card)' : 'transparent',
              borderRadius: 4, fontSize: 11 }}>
              <span style={{ minWidth: 90, color: 'var(--mut)', fontSize: 10 }}>{dateStr}</span>
              {timeStr && <span style={{ minWidth: 60, color: 'var(--mut)', fontSize: 10 }}>{timeStr}</span>}
              <span style={{ flex: 1, color: 'var(--tx)', fontWeight: 500 }}>{a.name}</span>
              <span style={{ fontSize: 10, color: 'var(--cc)', opacity: 0.7 }}>{a.cat}</span>
              {a.status && <span style={{ fontSize: 9, color: 'var(--mut)' }}>{a.status}</span>}
            </div>
          )
        })}
      </div>
      {filtered.length > limit && (
        <button onClick={() => setLimit(l => l + 50)}
          style={{ marginTop: 10, fontSize: 11, padding: '5px 14px', borderRadius: 6,
            background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>
          Show more ({filtered.length - limit} remaining)
        </button>
      )}
    </div>
  )
}
