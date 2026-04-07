import { useState, useEffect } from 'react'
import { uid, RAINBOW, rainbowAt } from '../constants'
import { supabase, hasSupabase } from '../supabase'

// ── Section definitions ────────────────────────────────────────
const SECTION_LABELS = [
  { k: 'decisions',  l: 'Canon Decisions / Locks' },
  { k: 'built',      l: 'Built / Fixed' },
  { k: 'completed',  l: 'Completed' },
  { k: 'flags',      l: 'Flags Raised' },
  { k: 'questions',  l: 'Open Questions' },
  { k: 'todo',       l: 'To-Do' },
  { k: 'notes',      l: 'Notes' },
]

// ── Size config ────────────────────────────────────────────────
const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const SIZE_COLS = { XS: 1, S: 1, M: 2, L: 2, XL: 3 }

// ── Supabase helpers ───────────────────────────────────────────
async function sbLoadSessions() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase.from('session_log').select('*').order('session_number', { ascending: true })
    if (error) { console.warn('Session log table not available:', error.message); return null }
    return data || []
  } catch (e) { console.warn('Session log load failed:', e); return null }
}

async function sbUpsertSession(entry) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').upsert(entry, { onConflict: 'id' })
    if (error) console.warn('Session log upsert skipped:', error.message)
  } catch {}
}

async function sbDeleteSession(id) {
  if (!hasSupabase) return
  try {
    const { error } = await supabase.from('session_log').delete().eq('id', id)
    if (error) console.warn('Session log delete skipped:', error.message)
  } catch {}
}

// ── Local storage fallback ─────────────────────────────────────
const LS_KEY = 'gcomp_session_log'
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function lsSave(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {} }

// ── Format a session as markdown ──────────────────────────────
function sessionToMd(s) {
  const lines = [`# Session ${s.session_number} · ${s.date}`]
  if (s.topics) lines.push(`\n**Topics:** ${s.topics}`)
  if (s.opened_at || s.closed_at) lines.push(`\nOpened: ${s.opened_at || '—'} | Closed: ${s.closed_at || '—'}`)
  SECTION_LABELS.forEach(({ k, l }) => {
    if (s[k] && s[k].trim()) lines.push(`\n## ${l}\n\n${s[k]}`)
  })
  lines.push('\n---')
  return lines.join('\n')
}

// ── Empty session ──────────────────────────────────────────────
function emptySession(num) {
  return {
    id: uid(),
    session_number: num,
    date: new Date().toLocaleDateString('en-CA'),
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

// ── Get card accent color by list position ─────────────────────
function cardColor(listIndex) {
  return RAINBOW[listIndex % RAINBOW.length]
}

// ── Session card (view mode) ───────────────────────────────────
function SessionCard({ session, listIndex, onEdit, onDelete, selected, onSelect, size }) {
  const [expanded, setExpanded] = useState(false)
  const accent = cardColor(listIndex)
  const tintBg = `${accent}12`
  const hasContent = SECTION_LABELS.some(({ k }) => session[k] && session[k].trim())

  return (
    <div
      className="session-card"
      style={{ background: tintBg, borderColor: accent }}
    >
      {/* Header */}
      <div className="session-card-header" onClick={() => setExpanded(e => !e)}>
        <input
          type="checkbox"
          checked={selected}
          onClick={e => e.stopPropagation()}
          onChange={e => onSelect(e.target.checked)}
          style={{ flexShrink: 0, accentColor: accent }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: size === 'XS' ? 11 : size === 'S' ? 12 : 13,
            fontWeight: 700,
            color: accent,
            letterSpacing: '.05em',
          }}>
            SESSION · {session.date}
            {session.session_number ? ` · #${session.session_number}` : ''}
          </div>
          {session.topics && (
            <div style={{
              fontSize: size === 'XS' ? 10 : 11,
              color: 'var(--dim)',
              marginTop: 2,
              lineHeight: 1.4,
            }}>
              {session.topics}
            </div>
          )}
          {(session.opened_at || session.closed_at) && (
            <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 2 }}>
              {session.opened_at && `Opened: ${session.opened_at}`}
              {session.opened_at && session.closed_at && ' · '}
              {session.closed_at && `Closed: ${session.closed_at}`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4,
              border: `1px solid ${accent}66`, background: 'none', color: accent, cursor: 'pointer' }}
          >Edit</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4,
              border: '1px solid #cc444466', background: 'none', color: '#cc4444', cursor: 'pointer' }}
          >✕</button>
          <span style={{ color: accent, fontSize: 13, opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && hasContent && (
        <div className="session-card-body" style={{ borderTop: `1px solid ${accent}33` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k] || !session[k].trim()) return null
            return (
              <div key={k}>
                <div className="session-section-label" style={{ color: accent }}>{l}</div>
                <div className="session-section-body"
                  style={{ fontSize: size === 'XS' ? 10 : size === 'S' ? 11 : 12 }}>
                  {session[k]}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {expanded && !hasContent && (
        <div className="session-card-body" style={{ borderTop: `1px solid ${accent}33`, padding: '8px 14px' }}>
          <span style={{ fontSize: 11, color: 'var(--mut)', fontStyle: 'italic' }}>No content recorded for this session.</span>
        </div>
      )}
    </div>
  )
}

// ── Session form (add/edit) ────────────────────────────────────
function SessionForm({ initial, onSave, onCancel, listIndex }) {
  const [form, setForm] = useState(initial)
  const accent = cardColor(listIndex)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const inputStyle = {
    width: '100%', padding: '6px 9px', borderRadius: 6,
    border: `1px solid ${accent}44`, background: 'var(--sf)',
    color: 'var(--tx)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }
  const taStyle = { ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }
  const labelStyle = { fontSize: 9, color: accent, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3, display: 'block', fontWeight: 700 }

  return (
    <div style={{
      background: `${accent}0e`,
      border: `2px solid ${accent}`,
      borderRadius: 12, padding: 16, marginBottom: 14,
    }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: accent, marginBottom: 12, fontWeight: 700 }}>
        {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Session #</label>
          <input style={inputStyle} type="number" value={form.session_number}
            onChange={e => set('session_number', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input style={inputStyle} type="date" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Opened</label>
          <input style={inputStyle} value={form.opened_at}
            onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 2:00 PM" />
        </div>
        <div>
          <label style={labelStyle}>Closed</label>
          <input style={inputStyle} value={form.closed_at}
            onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 5:30 PM" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Topics</label>
        <input style={inputStyle} value={form.topics}
          onChange={e => set('topics', e.target.value)}
          placeholder="Session 14 · Tab wiring · Global search · Font size pass" />
      </div>

      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <label style={labelStyle}>{l}</label>
          <textarea style={taStyle} value={form[k] || ''}
            onChange={e => set(k, e.target.value)}
            placeholder={`Record ${l.toLowerCase()} here…`} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={onCancel}
          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6,
            border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)}
          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6,
            border: 'none', background: accent, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
          Save Session
        </button>
      </div>
    </div>
  )
}

// ── Main SessionLog component ──────────────────────────────────
export default function SessionLog({ db, rainbowOn }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [size, setSize] = useState(() => {
    try { return localStorage.getItem('gcomp_sessionlog_size') || 'M' } catch { return 'M' }
  })

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 2800) }

  function setAndSaveSize(s) {
    setSize(s)
    try { localStorage.setItem('gcomp_sessionlog_size', s) } catch {}
    db.saveSetting('sessionlog_size', s)
  }

  useEffect(() => {
    const saved = db.settings?.sessionlog_size
    if (saved && SIZES.includes(saved)) setSize(saved)
  }, [db.settings])

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
    setSelected(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }

  function exportSelected() {
    const toExport = sessions.filter(s => selected.has(s.id)).sort((a, b) => a.session_number - b.session_number)
    if (!toExport.length) { flash('No sessions selected.'); return }
    const header = `# The Guardians of Lajen — Session Log\n\n*Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const blob = new Blob([header + toExport.map(sessionToMd).join('\n\n')], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = toExport.length === 1
      ? `session_${toExport[0].session_number}_${toExport[0].date}.md`
      : `guardians_sessions_${new Date().toISOString().slice(0,10)}.md`
    a.click()
    flash(`Exported ${toExport.length} session${toExport.length > 1 ? 's' : ''}.`)
  }

  function exportAll() {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number)
    if (!sorted.length) { flash('No sessions to export.'); return }
    const header = `# The Guardians of Lajen — Complete Session Log\n\n*Sahrynar (Melissa) & Claude · Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const blob = new Blob([header + sorted.map(sessionToMd).join('\n\n')], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_session_log_complete_${new Date().toISOString().slice(0,10)}.md`
    a.click()
    flash(`Exported all ${sorted.length} sessions.`)
  }

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase()
    return !q || [s.topics, s.decisions, s.built, s.notes, s.questions, s.flags, s.todo, s.completed]
      .some(f => f && f.toLowerCase().includes(q))
  })

  const nextNum = sessions.length ? Math.max(...sessions.map(s => Number(s.session_number))) + 1 : 1
  const cols = SIZE_COLS[size] || 1

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontFamily: "'Cinzel',serif" }}>
      Loading session log…
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: RAINBOW[2] }}>
          📋 Session Log
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Size picker */}
          <div style={{ display: 'flex', gap: 2 }}>
            {SIZES.map(s => (
              <button key={s} onClick={() => setAndSaveSize(s)}
                style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${size === s ? RAINBOW[2] : 'var(--brd)'}`,
                  background: size === s ? `${RAINBOW[2]}22` : 'none',
                  color: size === s ? RAINBOW[2] : 'var(--mut)' }}>
                {s}
              </button>
            ))}
          </div>
          {selected.size > 0 && (
            <>
              <button onClick={exportSelected} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8,
                border: `1px solid ${RAINBOW[2]}`, background: 'none', color: RAINBOW[2], cursor: 'pointer' }}>
                ↓ Export {selected.size}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8,
                border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
                Clear
              </button>
            </>
          )}
          <button onClick={exportAll} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8,
            border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            ↓ All
          </button>
          <button onClick={() => { setAdding(true); setEditing(null) }}
            style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8,
              border: 'none', background: RAINBOW[2], color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            + New Session
          </button>
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ fontSize: 11, color: RAINBOW[2], marginBottom: 8, padding: '5px 10px',
          background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>
          {msg}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions…"
          style={{ width: '100%', padding: '6px 10px', borderRadius: 6,
            border: '1px solid var(--brd)', background: 'var(--sf)',
            color: 'var(--tx)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Add form */}
      {adding && (
        <SessionForm initial={emptySession(nextNum)} listIndex={sessions.length}
          onSave={saveSession} onCancel={() => setAdding(false)} />
      )}

      {/* Edit form */}
      {editing && (
        <SessionForm initial={editing}
          listIndex={sessions.findIndex(s => s.id === editing.id)}
          onSave={saveSession} onCancel={() => setEditing(null)} />
      )}

      {/* Session grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mut)', fontStyle: 'italic', fontSize: 13 }}>
          {sessions.length === 0 ? 'No sessions yet. Add your first one!' : 'No sessions match your search.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 'var(--col-gap, 6px)',
        }}>
          {filtered.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              listIndex={i}
              onEdit={s => { setEditing(s); setAdding(false) }}
              onDelete={deleteSession}
              selected={selected.has(s.id)}
              onSelect={checked => toggleSelect(s.id, checked)}
              size={size}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--mut)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Cloud sync on' : 'Local only'}
      </div>
    </div>
  )
}
