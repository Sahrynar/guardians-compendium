import { useState, useCallback, useEffect, useRef } from 'react'
import { useDB } from './hooks/useDB'
import { useAutoBackup } from './hooks/useAutoBackup'
import { CATS, uid } from './constants'

// Tab components
import Dashboard from './tabs/Dashboard'
import Characters from './tabs/Characters'
import Wardrobe from './tabs/Wardrobe'
import Items from './tabs/Items'
import Locations from './tabs/Locations'
import Timeline from './tabs/Timeline'
import Scenes from './tabs/Scenes'
import CalendarTab from './tabs/CalendarTab'
import Tools from './tabs/Tools'
import Canon from './tabs/Canon'
import World from './tabs/World'
import Questions from './tabs/Questions'
import Eras from './tabs/Eras'
import Spellings from './tabs/Spellings'
import MapTab from './tabs/MapTab'
import Flags from './tabs/Flags'
import Wiki from './tabs/Wiki'
import FamilyTree from './tabs/FamilyTree'
import Notes from './tabs/Notes'
import Journal from './tabs/Journal'
import Inventory from './tabs/Inventory'
import Manuscript from './tabs/Manuscript'
import SessionLog from './tabs/SessionLog'
import IOBar from './components/common/IOBar'

// ── Nav order ─────────────────────────────────────────────────
const TAB_ORDER = [
  'dashboard',
  // Character & World
  'wiki','characters','familytree','world','locations',
  // Story & Writing
  'manuscript','scenes','timeline','eras','calendar',
  // Tracking & Craft
  'inventory','wardrobe','items','flags','questions','canon','spellings',
  // Tools & Meta
  'tools','map','notes','journal','sessionlog'
]

const VALID_TABS = new Set(TAB_ORDER)

// ── Searchable categories and their label fields ───────────────
const SEARCH_CATS = [
  { key: 'characters',  label: 'Characters',  tab: 'characters',  field: 'name' },
  { key: 'locations',   label: 'Locations',   tab: 'locations',   field: 'name' },
  { key: 'scenes',      label: 'Scenes',      tab: 'scenes',      field: 'name' },
  { key: 'items',       label: 'Items',       tab: 'items',       field: 'name' },
  { key: 'inventory',   label: 'Inventory',   tab: 'inventory',   field: 'name' },
  { key: 'canon',       label: 'Canon',       tab: 'canon',       field: 'name' },
  { key: 'world',       label: 'World',       tab: 'world',       field: 'name' },
  { key: 'questions',   label: 'Questions',   tab: 'questions',   field: 'name' },
  { key: 'flags',       label: 'Flags',       tab: 'flags',       field: 'name' },
  { key: 'spellings',   label: 'Spellings',   tab: 'spellings',   field: 'name' },
  { key: 'notes',       label: 'Notes',       tab: 'notes',       field: 'name' },
  { key: 'wiki',        label: 'Wiki',        tab: 'wiki',        field: 'name' },
  { key: 'timeline',    label: 'Timeline',    tab: 'timeline',    field: 'name' },
  { key: 'wardrobe',    label: 'Wardrobe',    tab: 'wardrobe',    field: 'name' },
  { key: 'manuscript',  label: 'Manuscript',  tab: 'manuscript',  field: 'title' },
]

function getSavedTab() {
  try {
    const t = localStorage.getItem('gcomp_active_tab')
    return (t && VALID_TABS.has(t)) ? t : 'dashboard'
  } catch { return 'dashboard' }
}

function getSavedFontSize() {
  try { return parseInt(localStorage.getItem('gcomp_font_size') || '15') } catch { return 15 }
}

// ── Quick Capture ──────────────────────────────────────────────
// Floating button available from any tab — saves to notes or flags
const QC_TYPES = [
  { key: 'notes',     label: 'Note',      color: 'var(--cw)',  icon: '📝' },
  { key: 'flags',     label: 'Flag',      color: 'var(--cfl)', icon: '🚩' },
  { key: 'questions', label: 'Question',  color: 'var(--cq)',  icon: '❓' },
  { key: 'canon',     label: 'Canon',     color: 'var(--ccn)', icon: '✦'  },
]

function QuickCapture({ db, onClose }) {
  const [text, setText] = useState('')
  const [type, setType] = useState('notes')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)
  const chosen = QC_TYPES.find(t => t.key === type)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doSave()
  }

  function doSave() {
    if (!text.trim()) return
    const entry = {
      id: uid(),
      name: text.trim().slice(0, 80),
      detail: text.trim().length > 80 ? text.trim() : '',
      notes: '',
      status: 'open',
      created: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.upsertEntry(type, entry)
    setSaved(true)
    setTimeout(() => { setText(''); setSaved(false); inputRef.current?.focus() }, 900)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 70,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'var(--sf)', border: `1px solid ${chosen.color}44`,
        borderRadius: 14, padding: 16, margin: '0 12px',
        boxShadow: `0 4px 32px rgba(0,0,0,.5), 0 0 0 1px ${chosen.color}22`,
      }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {QC_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                flex: 1, padding: '5px 4px', borderRadius: 8, fontSize: 'var(--fs-xs)',
                fontWeight: 700, border: `1px solid ${type === t.key ? t.color : 'var(--brd)'}`,
                background: type === t.key ? `${t.color}22` : 'none',
                color: type === t.key ? t.color : 'var(--mut)',
                cursor: 'pointer', transition: '.15s',
              }}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Quick ${chosen.label.toLowerCase()}… (Ctrl+Enter to save, Esc to close)`}
          style={{
            width: '100%', background: 'var(--card)', border: `1px solid ${chosen.color}44`,
            borderRadius: 8, color: 'var(--tx)', fontSize: 'var(--fs-sm)',
            padding: '8px 10px', outline: 'none', resize: 'none', minHeight: 72,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--mut)' }}>
            Saves to {chosen.label}s tab
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: saved ? 'var(--sl)' : chosen.color, color: '#000', minWidth: 64 }}
              onClick={doSave}
              disabled={!text.trim()}
            >{saved ? '✓ Saved!' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Global search ──────────────────────────────────────────────
function GlobalSearch({ db, goTo, goToWithSearch, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = q.trim().length < 2 ? [] : (() => {
    const lower = q.toLowerCase()
    const out = []
    SEARCH_CATS.forEach(({ key, label, tab, field }) => {
      const entries = db.db[key] || []
      entries.forEach(e => {
        const name = e[field] || e.name || ''
        const detail = e.detail || e.description || e.notes || e.text || ''
        if (name.toLowerCase().includes(lower) || detail.toLowerCase().includes(lower)) {
          out.push({ key, label, tab, name, detail, id: e.id })
        }
      })
    })
    return out.slice(0, 40)
  })()

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 60, padding: '60px 16px 16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 620,
        background: 'var(--sf)', border: '1px solid var(--brh)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--brd)' }}>
          <span style={{ color: 'var(--dim)', marginRight: 8, fontSize: 16 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search everything… (Esc to close)"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--tx)', fontSize: 15,
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {q.length >= 2 && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
              No results for "{q}"
            </div>
          )}
          {q.length < 2 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mut)', fontSize: 12 }}>
              Type at least 2 characters to search
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.key}-${r.id}-${i}`}
              onClick={() => { goToWithSearch ? goToWithSearch(r.tab, r.name) : goTo(r.tab); onClose() }}
              style={{
                width: '100%', textAlign: 'left', background: 'none',
                border: 'none', borderBottom: '1px solid var(--brd)',
                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                alignItems: 'flex-start', gap: 10, transition: '.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--cc)',
                background: 'rgba(201,102,255,.12)', padding: '2px 7px',
                borderRadius: 8, marginTop: 2, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {r.label}
              </span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{r.name}</div>
                {r.detail && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, lineHeight: 1.4 }}>
                    {r.detail.slice(0, 120)}{r.detail.length > 120 ? '…' : ''}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--brd)', fontSize: 10, color: 'var(--mut)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}{results.length === 40 ? ' (showing first 40)' : ''}
            {' · '}Click a result to jump to that tab
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const db = useDB()
  const backup = useAutoBackup(db.db)
  const [tab, setTab] = useState(getSavedTab)
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [fontSize, setFontSize] = useState(getSavedFontSize)
  const [showSearch, setShowSearch] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [crossLink, setCrossLink] = useState(null) // { search: string } — consumed once by target tab
  const tabBarRef = useRef(null)

  // ── Apply font size ────────────────────────────────────────────
  // Only override on desktop — mobile uses the CSS media query reset (13px)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches
    if (isMobile) return
    const fs = fontSize + 'px'
    document.documentElement.style.setProperty('--fs', fs)
    document.documentElement.style.fontSize = fs
    document.body.style.fontSize = fs
  }, [fontSize])

  // ── Persist active tab ─────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('gcomp_active_tab', tab) } catch {}
  }, [tab])

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // Cmd/Ctrl+K = global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(s => !s)
        return
      }
      // Cmd/Ctrl+Q = quick capture
      if ((e.metaKey || e.ctrlKey) && e.key === 'q') {
        e.preventDefault()
        setShowCapture(s => !s)
        return
      }
      // Only fire nav shortcuts when not typing in an input/textarea
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (showSearch) return

      if (e.key === 'ArrowLeft' && (e.altKey || e.metaKey)) {
        e.preventDefault()
        goBack()
      }
      if (e.key === 'ArrowRight' && (e.altKey || e.metaKey)) {
        e.preventDefault()
        goFwd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSearch, histIdx, history])

  // ── Tab bar touch-drag scroll ──────────────────────────────────
  useEffect(() => {
    const bar = tabBarRef.current
    if (!bar) return
    let startX = 0, startScroll = 0, dragging = false
    function onTouchStart(e) { startX = e.touches[0].clientX; startScroll = bar.scrollLeft; dragging = true }
    function onTouchMove(e) { if (!dragging) return; bar.scrollLeft = startScroll + (startX - e.touches[0].clientX) }
    function onTouchEnd() { dragging = false }
    bar.addEventListener('touchstart', onTouchStart, { passive: true })
    bar.addEventListener('touchmove', onTouchMove, { passive: true })
    bar.addEventListener('touchend', onTouchEnd)
    return () => {
      bar.removeEventListener('touchstart', onTouchStart)
      bar.removeEventListener('touchmove', onTouchMove)
      bar.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const goTo = useCallback((t) => {
    if (t === tab) return
    setHistory(prev => [...prev.slice(0, histIdx + 1), tab])
    setHistIdx(prev => prev + 1)
    setTab(t)
  }, [tab, histIdx])

  const goBack = useCallback(() => {
    if (histIdx >= 0) { setTab(history[histIdx]); setHistIdx(prev => prev - 1) }
  }, [history, histIdx])

  const goFwd = useCallback(() => {
    if (histIdx < history.length - 1) { setHistIdx(prev => prev + 1); setTab(history[histIdx + 1]) }
  }, [history, histIdx])

  const adjFont = useCallback((d) => {
    setFontSize(prev => {
      const next = Math.max(10, Math.min(22, prev + d))
      try { localStorage.setItem('gcomp_font_size', String(next)) } catch {}
      return next
    })
  }, [])

  function scrollTabs(dir) {
    const bar = tabBarRef.current
    if (bar) bar.scrollBy({ left: dir * 150, behavior: 'smooth' })
  }

  // Navigate to a tab and pre-populate its search box (and optionally expand a named entry)
  const goToWithSearch = useCallback((targetTab, searchStr) => {
    setCrossLink({ search: searchStr, expandName: searchStr })
    goTo(targetTab)
  }, [goTo])

  // Clear crossLink after it's been consumed (called by the receiving tab)
  const clearCrossLink = useCallback(() => setCrossLink(null), [])

  const tabProps = { db, goTo, goToWithSearch, crossLink, clearCrossLink, tab }
  function renderTab() {
    if (db.loading) return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>
          {db.hasSupabase ? 'Connecting to cloud…' : 'Loading…'}
        </div>
      </div>
    )
    switch (tab) {
      case 'dashboard':  return <Dashboard {...tabProps} />
      case 'wiki':       return <Wiki {...tabProps} />
      case 'characters': return <Characters {...tabProps} />
      case 'familytree': return <FamilyTree {...tabProps} />
      case 'world':      return <World {...tabProps} />
      case 'locations':  return <Locations {...tabProps} />
      case 'manuscript': return <Manuscript {...tabProps} />
      case 'scenes':     return <Scenes {...tabProps} />
      case 'timeline':   return <Timeline {...tabProps} />
      case 'eras':       return <Eras {...tabProps} />
      case 'calendar':   return <CalendarTab {...tabProps} />
      case 'inventory':  return <Inventory {...tabProps} />
      case 'wardrobe':   return <Wardrobe {...tabProps} />
      case 'items':      return <Items {...tabProps} />
      case 'flags':      return <Flags {...tabProps} />
      case 'questions':  return <Questions {...tabProps} />
      case 'canon':      return <Canon {...tabProps} />
      case 'spellings':  return <Spellings {...tabProps} />
      case 'tools':      return <Tools {...tabProps} />
      case 'map':        return <MapTab {...tabProps} />
      case 'notes':      return <Notes {...tabProps} />
      case 'journal':    return <Journal {...tabProps} />
      case 'sessionlog': return <SessionLog {...tabProps} />
      default:           return <Dashboard {...tabProps} />
    }
  }

  return (
    <div>
      {showSearch && <GlobalSearch db={db} goTo={goTo} goToWithSearch={goToWithSearch} onClose={() => setShowSearch(false)} />}
      {showCapture && <QuickCapture db={db} onClose={() => setShowCapture(false)} />}

      {/* ── Nav bar (sticky) ── */}
      <nav className="nav">
        <div className="nav-top">
          <div className="nav-btns">
            <button className="nav-btn" onClick={goBack} title="Back (Alt+←)">←</button>
            <button className="nav-btn" onClick={() => goTo('dashboard')} title="Home">⌂</button>
            <button className="nav-btn" onClick={goFwd} title="Forward (Alt+→)">→</button>
          </div>

          <button
            className="nav-title"
            onClick={() => goTo('dashboard')}
            title="Go to Dashboard"
            style={{
              fontSize: 15, letterSpacing: '.14em',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 6px', borderRadius: 4, transition: '.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            THE <b style={{ color: '#c966ff', textShadow: '0 0 12px rgba(201,102,255,.3)' }}>GUARDIANS</b>{' '}
            <span style={{ color: '#9999bb' }}>OF</span>{' '}
            <span style={{ color: '#e8dcc8' }}>LAJEN</span>{' '}
            <span style={{ color: '#666' }}>—</span>{' '}
            <span style={{ background: 'linear-gradient(90deg,#ff3366,#ffaa00,#00cc99,#3399ff,#9933ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Worldbuilding Compendium
            </span>
          </button>

          <div className="nav-btns">
            <span
              className={`sync-dot ${db.syncStatus}`}
              title={`Sync: ${db.syncStatus}${db.hasSupabase ? '' : ' (local only)'}`}
              style={{ marginRight: 4 }}
            />
            <button
              className="nav-btn"
              onClick={() => setShowSearch(true)}
              title="Search everything (Ctrl+K)"
              style={{ fontSize: 12 }}
            >🔍</button>
            <button className="nav-btn" onClick={() => adjFont(-1)} title="Smaller text">A−</button>
            <button className="nav-btn" onClick={() => adjFont(1)} title="Larger text">A+</button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="nav-btn" onClick={() => scrollTabs(-1)} style={{ flexShrink: 0 }}>◀</button>
          <div className="tabs-bar" id="tabBar" ref={tabBarRef}>
            {TAB_ORDER.map(k => {
              const c = CATS[k]
              if (!c) return null
              return (
                <button
                  key={k}
                  className={`tab-btn ${tab === k ? 'active' : ''}`}
                  style={{ '--tab-color': c.c }}
                  onClick={() => goTo(k)}
                >
                  {c.i} {c.l}
                </button>
              )
            })}
          </div>
          <button className="nav-btn" onClick={() => scrollTabs(1)} style={{ flexShrink: 0 }}>▶</button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="area">
        {renderTab()}
      </div>

      {/* ── Floating Quick Capture button ── */}
      <button
        onClick={() => setShowCapture(true)}
        title="Quick Capture (Ctrl+Q)"
        style={{
          position: 'fixed', bottom: 54, right: 16, zIndex: 49,
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--cc)', border: 'none', color: '#000',
          fontSize: 20, cursor: 'pointer', boxShadow: '0 2px 12px rgba(201,102,255,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,102,255,.6)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,102,255,.4)' }}
      >✦</button>

      {/* ── IO Bar ── */}
      <IOBar db={db} backup={backup} />
    </div>
  )
}
