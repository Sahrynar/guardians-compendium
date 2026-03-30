import { useState, useEffect } from 'react'
import { uid } from '../constants'
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
  const { data, error } = await supabase
    .from('session_log')
    .select('*')
    .order('session_number', { ascending: true })
  if (error) { console.error('Session log load error:', error); return null }
  return data || []
}

async function sbUpsertSession(entry) {
  if (!hasSupabase) return
  const { error } = await supabase
    .from('session_log')
    .upsert(entry, { onConflict: 'id' })
  if (error) console.error('Session log upsert error:', error)
}

async function sbDeleteSession(id) {
  if (!hasSupabase) return
  const { error } = await supabase
    .from('session_log')
    .delete()
    .eq('id', id)
  if (error) console.error('Session log delete error:', error)
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
function SessionCard({ session, onEdit, onDelete, selected, onSelect }) {
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
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: 700, color: col.text }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: 11, color: col.text, opacity: 0.75, marginTop: 2 }}>
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
                <div style={{ fontSize: 10, fontWeight: 700, color: col.text, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 12, color: col.text, whiteSpace: 'pre-wrap', lineHeight: 1.6, opacity: 0.9 }}>{session[k]}</div>
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
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: col.text, marginBottom: 12, fontWeight: 700 }}>
        {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
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
export default function SessionLog() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [filterEl, setFilterEl] = useState('All')

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: 'var(--cc)' }}>
          📋 Session Log
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', gap: 4 }}>
          {['All', ...ELEMENT_OPTS].map(el => {
            const col = ELEMENT_COLORS[el]
            return (
              <button
                key={el}
                onClick={() => setFilterEl(el)}
                style={{
                  fontSize: 10, padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                  border: filterEl === el ? `1.5px solid ${col?.border || 'var(--cc)'}` : '1px solid var(--brd)',
                  background: filterEl === el ? (col?.bg || 'var(--card)') : 'none',
                  color: filterEl === el ? (col?.text || 'var(--cc)') : 'var(--dim)',
                  fontWeight: filterEl === el ? 700 : 400,
                }}
              >{el}</button>
            )
          })}
        </div>
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
          />
        ))
      )}

      <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Synced to cloud' : 'Local only'}
      </div>
    </div>
  )
}
