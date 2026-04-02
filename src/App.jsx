import { useState, useCallback, useEffect, useRef } from 'react'
import { useDB } from './hooks/useDB'
import { useAutoBackup } from './hooks/useAutoBackup'
import { CATS } from './constants'

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
import Manuscript from './tabs/Manuscript'
import Inventory from './tabs/Inventory'
import OutfitSnapshot from './tabs/OutfitSnapshot'
import SessionLog from './tabs/SessionLog'
import Glossary from './tabs/Glossary'
import IOBar from './components/common/IOBar'

const TAB_ORDER = [
  'dashboard','wiki','glossary','characters','familytree','world','locations','map',
  'manuscript','scenes','timeline','eras','calendar',
  'inventory','wardrobe','items','flags','questions','canon','spellings',
  'notes','journal','tools','sessionlog'
]

const VALID_TABS = new Set(TAB_ORDER)

function getSavedTab() {
  try {
    const t = localStorage.getItem('gcomp_active_tab')
    return (t && VALID_TABS.has(t)) ? t : 'dashboard'
  } catch { return 'dashboard' }
}

function getSavedFontSize() {
  try { return parseInt(localStorage.getItem('gcomp_font_size') || '13') } catch { return 13 }
}

export default function App() {
  const db = useDB()
  const backup = useAutoBackup(db.db)
  const [tab, setTab] = useState(getSavedTab)
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [fontSize, setFontSize] = useState(getSavedFontSize)
  const tabBarRef = useRef(null)

  // ── Apply font size on mount AND on change ──────────────────────
  useEffect(() => {
    const fs = fontSize + 'px'
    document.documentElement.style.setProperty('--fs', fs)
    document.documentElement.style.fontSize = fs
    document.body.style.fontSize = fs
  }, [fontSize])

  // ── Persist active tab ──────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('gcomp_active_tab', tab) } catch {}
  }, [tab])

  // ── Tab bar touch-drag scroll ───────────────────────────────────
  useEffect(() => {
    const bar = tabBarRef.current
    if (!bar) return
    let startX = 0, startScroll = 0, dragging = false

    function onTouchStart(e) {
      startX = e.touches[0].clientX
      startScroll = bar.scrollLeft
      dragging = true
    }
    function onTouchMove(e) {
      if (!dragging) return
      const dx = startX - e.touches[0].clientX
      bar.scrollLeft = startScroll + dx
    }
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
    if (histIdx >= 0) {
      setTab(history[histIdx])
      setHistIdx(prev => prev - 1)
    }
  }, [history, histIdx])

  const goFwd = useCallback(() => {
    if (histIdx < history.length - 1) {
      setHistIdx(prev => prev + 1)
      setTab(history[histIdx + 1])
    }
  }, [history, histIdx])

  const adjFont = useCallback((d) => {
    setFontSize(prev => {
      const next = Math.max(10, Math.min(20, prev + d))
      try { localStorage.setItem('gcomp_font_size', String(next)) } catch {}
      return next
    })
  }, [])

  function scrollTabs(dir) {
    const bar = tabBarRef.current
    if (bar) bar.scrollBy({ left: dir * 150, behavior: 'smooth' })
  }

  const tabProps = { db, goTo, tab }

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
      case 'characters': return <Characters {...tabProps} />
      case 'wardrobe':   return <Wardrobe {...tabProps} />
      case 'items':      return <Items {...tabProps} />
      case 'locations':  return <Locations {...tabProps} />
      case 'timeline':   return <Timeline {...tabProps} />
      case 'scenes':     return <Scenes {...tabProps} />
      case 'calendar':   return <CalendarTab {...tabProps} />
      case 'manuscript':  return <Manuscript {...tabProps} />
      case 'inventory':   return <Inventory {...tabProps} />
      case 'outfitsnapshot': return <OutfitSnapshot db={db} chars={db.db.characters || []} allEntries={db.db} />
      case 'sessionlog':  return <SessionLog {...tabProps} />
      case 'tools':      return <Tools {...tabProps} />
      case 'canon':      return <Canon {...tabProps} />
      case 'world':      return <World {...tabProps} />
      case 'questions':  return <Questions {...tabProps} />
      case 'eras':       return <Eras {...tabProps} />
      case 'spellings':  return <Spellings {...tabProps} />
      case 'map':        return <MapTab {...tabProps} />
      case 'wiki':       return <Wiki {...tabProps} />
      case 'glossary':   return <Glossary db={db} goTo={goTo} />
      case 'notes':      return <Notes {...tabProps} />
      case 'journal':    return <Journal {...tabProps} />
      case 'familytree': return <FamilyTree {...tabProps} />
      case 'flags':      return <Flags {...tabProps} />
      default:           return <Dashboard {...tabProps} />
    }
  }

  return (
    <div>
      {/* ── Nav bar (sticky) ── */}
      <nav className="nav">
        <div className="nav-top">
          <div className="nav-btns">
            <button className="nav-btn" onClick={goBack} title="Back">←</button>
            <button className="nav-btn" onClick={() => goTo('dashboard')} title="Home">⌂</button>
            <button className="nav-btn" onClick={goFwd} title="Forward">→</button>
          </div>

          {/* Title — clickable home link */}
          <button
            className="nav-title"
            onClick={() => goTo('dashboard')}
            title="Go to Dashboard"
            style={{
              fontSize: 18, letterSpacing: '.12em',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 6px', borderRadius: 4, transition: '.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            THE <b style={{ color: '#dd77ff', textShadow: '0 0 14px rgba(221,119,255,.45)', fontSize: 19 }}>GUARDIANS</b>{' '}
            <span style={{ color: '#aaaacc' }}>OF</span>{' '}
            <span style={{ color: '#f0e8d8', fontWeight: 600 }}>LAJEN</span>{' '}
            <span style={{ color: '#555' }}>—</span>{' '}
            <span style={{ background: 'linear-gradient(90deg,#ff69b4,#ff2222,#ff8800,#ffdd00,#44cc44,#00ccaa,#3399ff,#6644ff,#aa33ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>
              Worldbuilding Compendium
            </span>
          </button>

          <div className="nav-btns">
            <span
              className={`sync-dot ${db.syncStatus}`}
              title={`Sync: ${db.syncStatus}${db.hasSupabase ? '' : ' (local only)'}`}
              style={{ marginRight: 4 }}
            />
            <button className="nav-btn" onClick={() => adjFont(-1)} title="Smaller text">A−</button>
            <button className="nav-btn" onClick={() => adjFont(1)} title="Larger text">A+</button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="nav-btn" onClick={() => scrollTabs(-1)} style={{ flexShrink: 0 }}>◀</button>
          <div className="tabs-bar" id="tabBar" ref={tabBarRef}>
            {TAB_ORDER.map((k, i) => {
              const c = CATS[k]
              if (!c) return null
              // Rainbow gradient matching the header: pink→red→orange→yellow→green→teal→blue→indigo→purple
              const rainbow = ['#ff69b4','#ff3366','#ff5500','#ff8800','#ffcc00','#aadd00','#44cc44','#00cc88','#00cccc','#2299dd','#3366ff','#5544ff','#7733ee','#9933cc','#bb33aa','#dd44aa','#ff69b4','#ff3366','#ff5500','#ff8800','#ffcc00','#aadd00','#44cc44','#00cc88']
              const tabColor = rainbow[i % rainbow.length]
              return (
                <button
                  key={k}
                  className={`tab-btn ${tab === k ? 'active' : ''}`}
                  style={{ '--tab-color': tabColor }}
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

      {/* ── IO Bar ── */}
      <IOBar db={db} backup={backup} />
    </div>
  )
}
