import { useState, useEffect } from 'react'
import { uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

const RAINBOW = [
  '#ff69b4','#ff6b6b','#e63946','#f4442e','#ff8c00','#ffb700','#ffd600',
  '#aacc00','#38b000','#0fb5a0','#00b4d8','#4cc9f0','#3a86ff','#4361ee',
  '#7b2d8b','#9d4edd','#c77dff','#ff48c4'
]
const rc = (i) => RAINBOW[((i % 18) + 18) % 18]

const SECTION_LABELS = [
  { k: 'decisions',  l: 'Canon Decisions / Locks' },
  { k: 'built',      l: 'Built / Fixed' },
  { k: 'completed',  l: 'Completed' },
  { k: 'flags',      l: 'Flags Raised' },
  { k: 'questions',  l: 'Open Questions' },
  { k: 'todo',       l: 'To-Do' },
  { k: 'notes',      l: 'Notes' },
]

const TAB_COLOR = '#9d4edd' // Purple

async function sbLoadSessions() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase
      .from('session_log')
      .select('*')
      .order('session_number', { ascending: true })
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

const LS_KEY = 'gcomp_session_log'
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function lsSave(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {} }

function sessionToMd(s) {
  const lines = [`# Session ${s.session_number} · ${s.date}`]
  if (s.topics) lines.push(`\n**Topics:** ${s.topics}`)
  if (s.opened_at || s.closed_at) lines.push(`\nOpened: ${s.opened_at||'—'} | Closed: ${s.closed_at||'—'}`)
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

// ── Session card ──────────────────────────────────────────────────
function SessionCard({ session, idx, onEdit, onDelete, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const color = rc(idx)
  // dark card: border + header text carry spectrum color; bg stays dark
  const hasContent = SECTION_LABELS.some(({ k }) => session[k]?.trim())

  return (
    <div style={{
      background: 'var(--card)', border: `1.5px solid ${color}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <input type="checkbox" checked={selected}
          onClick={e => e.stopPropagation()}
          onChange={e => onSelect(e.target.checked)}
          style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', fontWeight: 700, color }}>
            Session {session.session_number} · {session.date}
          </div>
          {session.topics && (
            <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 2 }}>{session.topics}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(session) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4,
              border: `1px solid ${color}`, background: 'none', color, cursor: 'pointer' }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(session.id) }}
            style={{ fontSize: '0.85em', padding: '2px 8px', borderRadius: 4,
              border: '1px solid #cc4444', background: 'none', color: '#cc4444', cursor: 'pointer' }}>✕</button>
          <span style={{ color, fontSize: '0.92em', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && hasContent && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${color}33` }}>
          {SECTION_LABELS.map(({ k, l }) => {
            if (!session[k]?.trim()) return null
            return (
              <div key={k} style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.77em', fontWeight: 700, color,
                  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: '0.92em', color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {session[k]}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Session form ──────────────────────────────────────────────────
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
    <div style={{ background: 'var(--card)', border: `2px solid ${TAB_COLOR}`,
      borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', color: TAB_COLOR,
        marginBottom: 12, fontWeight: 700 }}>
        {initial.session_number ? `Edit Session ${initial.session_number}` : 'New Session'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Session #</div>
          <input style={inputStyle} type="number" value={form.session_number}
            onChange={e => set('session_number', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Date</div>
          <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Opened</div>
          <input style={inputStyle} value={form.opened_at} onChange={e => set('opened_at', e.target.value)} placeholder="e.g. 9:00 PM" />
        </div>
        <div>
          <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Closed</div>
          <input style={inputStyle} value={form.closed_at} onChange={e => set('closed_at', e.target.value)} placeholder="e.g. 11:30 PM" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginBottom: 3, textTransform: 'uppercase' }}>Topics</div>
        <input style={inputStyle} value={form.topics} onChange={e => set('topics', e.target.value)} placeholder="Brief summary of topics covered" />
      </div>

      {SECTION_LABELS.map(({ k, l }) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.77em', color: TAB_COLOR, marginBottom: 3,
            textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>{l}</div>
          <textarea style={taStyle} value={form[k] || ''} onChange={e => set(k, e.target.value)}
            placeholder={`${l}…`} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" style={{ background: TAB_COLOR }}
          onClick={() => onSave(form)}>Save Session</button>
      </div>
    </div>
  )
}

// ── Main SessionLog ───────────────────────────────────────────────
export default function SessionLog({ db, navSearch }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')

  const search = navSearch || ''

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

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

  function exportAll() {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number)
    if (!sorted.length) { flash('No sessions to export.'); return }
    const header = `# The Guardians of Lajen — Complete Session Log\n\n*Sahrynar (Melissa) & Claude · Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`
    const blob = new Blob([header + sorted.map(sessionToMd).join('\n\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `guardians_session_log_complete_${new Date().toISOString().slice(0,10)}.md`
    a.click(); flash(`Exported all ${sorted.length} sessions.`)
  }

  const filtered = sessions.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return [s.topics, s.decisions, s.built, s.notes, s.questions, s.flags, s.todo, s.completed]
      .some(f => f && f.toLowerCase().includes(q))
  })

  const nextNum = sessions.length ? Math.max(...sessions.map(s => Number(s.session_number))) + 1 : 1

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontFamily: "'Cinzel',serif" }}>
      Loading session log…
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: TAB_COLOR }}>
          📋 Session Log
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={exportAll}
            style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8,
              border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
            ↓ Export All
          </button>
          <button onClick={() => { setAdding(true); setEditing(null) }}
            style={{ fontSize: '0.85em', padding: '4px 12px', borderRadius: 8,
              border: 'none', background: TAB_COLOR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            + New Session
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: '0.92em', color: TAB_COLOR, marginBottom: 10, padding: '6px 12px',
          background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)' }}>{msg}</div>
      )}

      {adding && <SessionForm initial={emptySession(nextNum)} onSave={saveSession} onCancel={() => setAdding(false)} />}
      {editing && <SessionForm initial={editing} onSave={saveSession} onCancel={() => setEditing(null)} />}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontStyle: 'italic' }}>
          {sessions.length === 0 ? 'No sessions yet. Add your first one!' : 'No sessions match your search.'}
        </div>
      ) : (
        filtered.map((s, i) => (
          <SessionCard
            key={s.id} session={s} idx={i}
            onEdit={s => { setEditing(s); setAdding(false) }}
            onDelete={deleteSession}
            selected={selected.has(s.id)}
            onSelect={checked => toggleSelect(s.id, checked)}
          />
        ))
      )}

      <div style={{ fontSize: '0.85em', color: 'var(--dim)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} · {hasSupabase ? 'Synced to cloud' : 'Local only'}
      </div>
    </div>
  )
}
