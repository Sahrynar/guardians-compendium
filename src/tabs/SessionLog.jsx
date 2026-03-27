import { useState, useEffect, useCallback } from 'react'
import { uid } from '../constants'
import { supabase, hasSupabase } from '../supabase'

const TABLE = 'session_log'

// ── Supabase helpers ──────────────────────────────────────────────
async function sbLoad() {
  if (!hasSupabase) return null
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false })
  if (error) { console.error('SessionLog load:', error); return null }
  return data
}

async function sbSave(session) {
  if (!hasSupabase) return false
  const { error } = await supabase.from(TABLE).upsert(session, { onConflict: 'id' })
  if (error) { console.error('SessionLog save:', error); return false }
  return true
}

async function sbDelete(id) {
  if (!hasSupabase) return false
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) { console.error('SessionLog delete:', error); return false }
  return true
}

// ── localStorage fallback ─────────────────────────────────────────
const LS_KEY = 'gol_session_log'
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function lsSave(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch {} }

// ── Helpers ───────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10) }
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' })
}
function parseItems(raw) {
  return (raw || '').split('\n').map(s => s.trim()).filter(Boolean)
    .map(s => ({ text: s.replace(/^✓\s*/, ''), done: s.startsWith('✓') }))
}
function serializeItems(items) {
  return items.map(i => i.done ? `✓ ${i.text}` : i.text).join('\n')
}

// ── Item list editor ──────────────────────────────────────────────
function ItemListEditor({ value, onChange, placeholder, allowDone = false }) {
  const [newItem, setNewItem] = useState('')
  const items = parseItems(value)

  function addItem() {
    const t = newItem.trim(); if (!t) return
    onChange(serializeItems([...items, { text: t, done: false }]))
    setNewItem('')
  }
  function toggleDone(i) {
    onChange(serializeItems(items.map((it, idx) => idx === i ? { ...it, done: !it.done } : it)))
  }
  function removeItem(i) { onChange(serializeItems(items.filter((_, idx) => idx !== i))) }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:4 }}>
          {allowDone && (
            <button onClick={() => toggleDone(i)} style={{ background:'none', border:'none',
              cursor:'pointer', fontSize:13, color: item.done ? 'var(--sl)' : 'var(--mut)',
              flexShrink:0, paddingTop:1 }}>
              {item.done ? '✓' : '○'}
            </button>
          )}
          <span style={{ flex:1, fontSize:11, color:'var(--tx)', lineHeight:1.5,
            textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}>
            {item.text}
          </span>
          <button onClick={() => removeItem(i)} style={{ background:'none', border:'none',
            cursor:'pointer', fontSize:11, color:'var(--mut)', flexShrink:0 }}>✕</button>
        </div>
      ))}
      <div style={{ display:'flex', gap:6, marginTop:4 }}>
        <input value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()} placeholder={placeholder}
          style={{ flex:1, fontSize:11, padding:'4px 8px', background:'var(--sf)',
            border:'1px solid var(--brd)', borderRadius:6, color:'var(--tx)' }} />
        <button className="btn btn-sm btn-outline"
          style={{ fontSize:11, padding:'4px 10px' }} onClick={addItem}>+ Add</button>
      </div>
    </div>
  )
}

// ── Form sections config ──────────────────────────────────────────
const FORM_SECTIONS = [
  { key:'decisions', label:'Decisions & Canon Locks', icon:'✦', color:'var(--sl)',
    placeholder:"e.g. Martyn's ring hides Power only — locked", allowDone:false },
  { key:'built',     label:'Built / Fixed',           icon:'🔧', color:'var(--cl)',
    placeholder:'e.g. PWA support added to Compendium', allowDone:false },
  { key:'completed', label:'Completed This Session',  icon:'✓',  color:'var(--sl)',
    placeholder:'e.g. Items pass Batch 3 built and approved', allowDone:true },
  { key:'flags',     label:'Flags Raised',            icon:'🚩', color:'var(--cfl)',
    placeholder:'e.g. fl_ch13_ring_scene_rewrite — B1 Ch.13 needs rewrite', allowDone:false },
  { key:'questions', label:'Open Questions',          icon:'?',  color:'var(--sp)',
    placeholder:"e.g. Aenya's demon name — blank in B3 ~line 832", allowDone:true },
  { key:'todos',     label:'To-Do',                   icon:'→',  color:'var(--cc)',
    placeholder:'e.g. Deploy Compendium batch build', allowDone:true },
  { key:'notes',     label:'Session Notes',           icon:'📝', color:'var(--dim)',
    placeholder:'Anything else worth noting…', allowDone:false },
]

const EMPTY_FORM = { date: today(), title: '', decisions:'', built:'',
  completed:'', flags:'', questions:'', todos:'', notes:'' }

// ── Session form ──────────────────────────────────────────────────
function SessionForm({ initial, onSave, onCancel, prevTodos='', prevQuestions='' }) {
  const [form, setForm] = useState(() => initial || { ...EMPTY_FORM,
    todos: prevTodos, questions: prevQuestions })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:10, color:'var(--mut)', textTransform:'uppercase',
            letterSpacing:'.05em', display:'block', marginBottom:4 }}>Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            style={{ width:'100%', fontSize:11, padding:'5px 8px', background:'var(--sf)',
              border:'1px solid var(--brd)', borderRadius:6, color:'var(--tx)' }} />
        </div>
        <div style={{ flex:2 }}>
          <label style={{ fontSize:10, color:'var(--mut)', textTransform:'uppercase',
            letterSpacing:'.05em', display:'block', marginBottom:4 }}>Session Title / Topics</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. PWA build · RLS fix · Items Batch 3"
            style={{ width:'100%', fontSize:11, padding:'5px 8px', background:'var(--sf)',
              border:'1px solid var(--brd)', borderRadius:6, color:'var(--tx)' }} />
        </div>
      </div>

      {FORM_SECTIONS.map(s => (
        <div key={s.key} style={{ border:'1px solid var(--brd)', borderRadius:8, padding:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:s.color, marginBottom:8 }}>
            {s.icon} {s.label}
          </div>
          <ItemListEditor value={form[s.key]} onChange={v => set(s.key, v)}
            placeholder={s.placeholder} allowDone={s.allowDone} />
        </div>
      ))}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        {onCancel && <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-primary btn-sm"
          style={{ background:'var(--cc)', color:'#000' }}
          onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Session'}
        </button>
      </div>
    </div>
  )
}

// ── Session view ──────────────────────────────────────────────────
const VIEW_SECTIONS = [
  { key:'decisions', label:'Decisions & Canon Locks', icon:'✦', color:'var(--sl)' },
  { key:'built',     label:'Built / Fixed',           icon:'🔧', color:'var(--cl)' },
  { key:'completed', label:'Completed',               icon:'✓',  color:'var(--sl)' },
  { key:'flags',     label:'Flags Raised',            icon:'🚩', color:'var(--cfl)' },
  { key:'questions', label:'Open Questions',          icon:'?',  color:'var(--sp)' },
  { key:'todos',     label:'To-Do',                   icon:'→',  color:'var(--cc)' },
  { key:'notes',     label:'Notes',                   icon:'📝', color:'var(--dim)' },
]

function SessionView({ session, onEdit, onDelete }) {
  const [showDone, setShowDone] = useState(false)

  return (
    <div style={{ border:'1px solid var(--brd)', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
      <div style={{ padding:'10px 14px', background:'var(--card)',
        borderBottom:'1px solid var(--brd)', display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:'var(--cc)' }}>
            {session.title || 'Session'}
          </div>
          <div style={{ fontSize:10, color:'var(--mut)', marginTop:2 }}>
            {formatDate(session.date)}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-sm btn-outline"
            style={{ fontSize:10, color:'var(--cc)', borderColor:'var(--cc)44' }}
            onClick={() => onEdit(session)}>✎ Edit</button>
          <button className="btn btn-sm btn-outline"
            style={{ fontSize:10, color:'#ff3355', borderColor:'#ff335544' }}
            onClick={() => onDelete(session.id)}>✕</button>
        </div>
      </div>

      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        {VIEW_SECTIONS.map(s => {
          const items = parseItems(session[s.key] || '')
          if (!items.length) return null
          const open = items.filter(i => !i.done)
          const done = items.filter(i => i.done)
          return (
            <div key={s.key}>
              <div style={{ fontSize:10, fontWeight:700, color:s.color,
                textTransform:'uppercase', letterSpacing:'.05em', marginBottom:5 }}>
                {s.icon} {s.label}
              </div>
              {open.map((item, i) => (
                <div key={i} style={{ fontSize:11, color:'var(--tx)',
                  lineHeight:1.5, paddingLeft:12, marginBottom:2 }}>· {item.text}</div>
              ))}
              {done.length > 0 && (
                <div style={{ marginTop:4 }}>
                  <button onClick={() => setShowDone(p => !p)}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      fontSize:10, color:'var(--mut)', padding:0 }}>
                    {showDone ? '▾' : '▸'} {done.length} completed item{done.length!==1?'s':''}
                  </button>
                  {showDone && done.map((item, i) => (
                    <div key={i} style={{ fontSize:11, color:'var(--mut)',
                      textDecoration:'line-through', lineHeight:1.5,
                      paddingLeft:12, marginBottom:2 }}>· {item.text}</div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────
function sessionToText(session) {
  const lines = [
    'THE GUARDIANS OF LAJEN — SESSION LOG',
    `${session.title || 'Session'} · ${formatDate(session.date)}`,
    '═'.repeat(50), ''
  ]
  VIEW_SECTIONS.forEach(s => {
    const items = parseItems(session[s.key] || '')
    if (!items.length) return
    lines.push(s.label.toUpperCase(), '─'.repeat(30))
    items.forEach(i => lines.push(`${i.done ? '✓' : '·'} ${i.text}`))
    lines.push('')
  })
  return lines.join('\n')
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename; a.click()
  URL.revokeObjectURL(a.href)
}

// ── Main tab ──────────────────────────────────────────────────────
export default function SessionLog() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list')
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')

  // Load on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      if (hasSupabase) {
        const data = await sbLoad()
        if (data) { setSessions(data); lsSave(data) }
        else setSessions(lsLoad())
      } else {
        setSessions(lsLoad())
      }
      setLoading(false)
    }
    load()
  }, [])

  function flash(msg, ms=2500) { setSyncMsg(msg); setTimeout(() => setSyncMsg(''), ms) }

  async function handleSave(form) {
    const entry = { ...form, id: editing?.id || uid() }
    const next = editing
      ? sessions.map(s => s.id === entry.id ? entry : s)
      : [...sessions, entry]
    setSessions(next); lsSave(next)
    if (hasSupabase) {
      const ok = await sbSave(entry)
      flash(ok ? '✓ Saved to cloud' : '⚠ Saved locally only')
    }
    setMode('list'); setEditing(null)
  }

  async function handleDelete(id) {
    const next = sessions.filter(s => s.id !== id)
    setSessions(next); lsSave(next); setConfirmId(null)
    if (hasSupabase) {
      const ok = await sbDelete(id)
      flash(ok ? '✓ Deleted' : '⚠ Deleted locally only')
    }
  }

  const sorted = [...sessions].sort((a, b) => (b.date||'').localeCompare(a.date||''))
  const lastSession = sorted[0]
  const carriedTodos = lastSession
    ? serializeItems(parseItems(lastSession.todos).filter(i => !i.done)) : ''
  const carriedQuestions = lastSession
    ? serializeItems(parseItems(lastSession.questions).filter(i => !i.done)) : ''

  return (
    <div style={{ padding:'0 4px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:'var(--cc)' }}>
            📋 Session Log
          </div>
          {syncMsg && <div style={{ fontSize:9, color:'var(--sl)', marginTop:2 }}>{syncMsg}</div>}
          {!hasSupabase && (
            <div style={{ fontSize:9, color:'var(--sp)', marginTop:2 }}>
              ⚠ Local only — Supabase not connected
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {mode === 'list' && (
            <>
              <button className="btn btn-sm btn-outline" style={{ fontSize:10 }}
                onClick={() => downloadText(
                  sorted.map(s => sessionToText(s)).join('\n\n' + '═'.repeat(50) + '\n\n'),
                  `guardians-full-log-${today()}.txt`)}>
                ⬇ Full Log (.txt)
              </button>
              <button className="btn btn-primary btn-sm"
                style={{ background:'var(--cc)', color:'#000', fontSize:10 }}
                onClick={() => { setEditing(null); setMode('new') }}>
                + New Session
              </button>
            </>
          )}
          {mode !== 'list' && (
            <button className="btn btn-sm btn-outline"
              onClick={() => { setMode('list'); setEditing(null) }}>← Back</button>
          )}
        </div>
      </div>

      {/* Form */}
      {(mode === 'new' || mode === 'edit') && (
        <SessionForm
          initial={editing}
          prevTodos={mode === 'new' ? carriedTodos : undefined}
          prevQuestions={mode === 'new' ? carriedQuestions : undefined}
          onSave={handleSave}
          onCancel={() => { setMode('list'); setEditing(null) }}
        />
      )}

      {/* List */}
      {mode === 'list' && (
        <>
          {loading && (
            <div style={{ textAlign:'center', padding:30, color:'var(--mut)', fontSize:11 }}>
              Loading…
            </div>
          )}
          {!loading && !sorted.length && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--mut)', fontSize:12 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
              <p>No sessions logged yet.</p>
              <button className="btn btn-primary btn-sm"
                style={{ background:'var(--cc)', color:'#000', marginTop:8 }}
                onClick={() => setMode('new')}>+ Add First Session</button>
            </div>
          )}
          {sorted.map(s => (
            <div key={s.id}>
              <SessionView session={s}
                onEdit={sess => { setEditing(sess); setMode('edit') }}
                onDelete={id => setConfirmId(id)} />
              <div style={{ textAlign:'right', marginTop:-6, marginBottom:10 }}>
                <button style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:10, color:'var(--mut)' }}
                  onClick={() => downloadText(sessionToText(s),
                    `guardians-session-${s.date||'unknown'}.txt`)}>
                  ⬇ This session (.txt)
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Delete confirm */}
      {confirmId && (
        <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,.8)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--sf)', border:'1px solid var(--brd)',
            borderRadius:12, padding:20, maxWidth:300, textAlign:'center' }}>
            <p style={{ fontSize:12, marginBottom:14 }}>Delete this session entry?</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>
              <button style={{ background:'#ff3355', color:'#fff', border:'none',
                borderRadius:6, padding:'5px 14px', cursor:'pointer', fontSize:11 }}
                onClick={() => handleDelete(confirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
