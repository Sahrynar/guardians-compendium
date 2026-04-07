import { useState, useCallback, useEffect, useRef } from 'react'
import { useDB } from './hooks/useDB'
import { useAutoBackup } from './hooks/useAutoBackup'
import { CATS, TAB_RAINBOW, RAINBOW, rainbowAt } from './constants'

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
import SessionLog from './tabs/SessionLog'
import Manuscript from './tabs/Manuscript'
import Inventory from './tabs/Inventory'
import IOBar from './components/common/IOBar'

const TAB_ORDER = [
  'dashboard','characters','wardrobe','items','locations',
  'timeline','scenes','calendar','tools','canon','world',
  'questions','eras','spellings','map','wiki','notes',
  'journal','familytree','flags','manuscript','sessionlog','inventory'
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

// ── Settings Panel ──────────────────────────────────────────────
function SettingsPanel({ open, onClose, db, tabRainbow, setTabRainbow, colGap, setColGap, colDivider, setColDivider }) {
  const tabs = TAB_ORDER.filter(k => k !== 'dashboard')

  function toggleTabRainbow(tabKey) {
    const next = { ...tabRainbow, [tabKey]: !tabRainbow[tabKey] }
    setTabRainbow(next)
    db.saveSetting('tab_rainbow', JSON.stringify(next))
  }

  function setAllRainbow(val) {
    const next = {}
    tabs.forEach(k => { next[k] = val })
    setTabRainbow(next)
    db.saveSetting('tab_rainbow', JSON.stringify(next))
  }

  function saveGap(val) {
    setColGap(val)
    db.saveSetting('col_gap', val)
    document.documentElement.style.setProperty('--col-gap', val + 'px')
  }

  function saveDivider(val) {
    setColDivider(val)
    db.saveSetting('col_divider', val ? '1' : '0')
    document.documentElement.style.setProperty('--col-divider', val ? '1' : '0')
  }

  if (!open) return null
  return (
    <div className="settings-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--tx)' }}>⚙ Compendium Settings</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>

        {/* Column layout */}
        <div className="settings-section">
          <div className="settings-section-title">Column Layout</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--dim)' }}>Column gap</label>
            <input type="range" min="0" max="24" value={colGap} onChange={e => saveGap(Number(e.target.value))}
              style={{ flex: 1, minWidth: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--tx)', minWidth: 28 }}>{colGap}px</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--dim)' }}>Column divider lines</label>
            <button
              onClick={() => saveDivider(!colDivider)}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${colDivider ? '#ffffff' : 'var(--brd)'}`,
                background: colDivider ? 'rgba(255,255,255,.08)' : 'none',
                color: colDivider ? '#fff' : 'var(--dim)' }}
            >{colDivider ? '▪ On' : '○ Off'}</button>
          </div>
        </div>

        {/* Rainbow per tab */}
        <div className="settings-section">
          <div className="settings-section-title">Rainbow Mode — per Tab</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button onClick={() => setAllRainbow(true)}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)' }}>
              🌈 All On
            </button>
            <button onClick={() => setAllRainbow(false)}
              style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)' }}>
              ○ All Off
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
            {tabs.map((k, i) => {
              const c = CATS[k]
              const on = !!tabRainbow[k]
              const rc = TAB_RAINBOW[k] || rainbowAt(i)
              return (
                <button key={k} onClick={() => toggleTabRainbow(k)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 10, padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${on ? rc : 'var(--brd)'}`,
                    background: on ? `${rc}18` : 'none',
                    color: on ? rc : 'var(--dim)', textAlign: 'left' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? rc : 'var(--mut)', flexShrink: 0 }} />
                  {c?.i} {c?.l || k}
                </button>
              )
            })}
          </div>
        </div>

        {/* Header image */}
        <div className="settings-section">
          <div className="settings-section-title">Header Image</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>
            Upload an image to replace the title text. Stored in the image library.
          </div>
          <HeaderImageUploader db={db} />
        </div>
      </div>
    </div>
  )
}

// ── Header image uploader (used in settings) ───────────────────
function HeaderImageUploader({ db }) {
  const fileRef = useRef()
  const current = db.settings?.header_image || null

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      db.saveSetting('header_image', dataUrl)
      // Also store in image library
      const img = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: 'Header Image — ' + new Date().toLocaleDateString(),
        url: dataUrl,
        source: 'header',
        created: new Date().toISOString(),
      }
      db.upsertEntry('images', img)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {current && (
        <img src={current} alt="Header" style={{ height: 40, borderRadius: 4, border: '1px solid var(--brd)' }} />
      )}
      <button onClick={() => fileRef.current?.click()}
        style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--brd)', background: 'none', color: 'var(--dim)' }}>
        {current ? '↑ Change image' : '↑ Upload image'}
      </button>
      {current && (
        <button onClick={() => db.saveSetting('header_image', null)}
          style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid #ff335544', background: 'none', color: '#ff3355' }}>
          Remove
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Main App ────────────────────────────────────────────────────
export default function App() {
  const db = useDB()
  const backup = useAutoBackup(db.db)
  const [tab, setTab] = useState(getSavedTab)
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [fontSize, setFontSize] = useState(getSavedFontSize)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tabRainbow, setTabRainbow] = useState({})
  const [colGap, setColGap] = useState(6)
  const [colDivider, setColDivider] = useState(false)
  const tabBarRef = useRef(null)

  // ── Load settings from db ───────────────────────────────────
  useEffect(() => {
    if (!db.settings) return
    // tab rainbow
    try {
      const tr = db.settings.tab_rainbow
      if (tr) setTabRainbow(typeof tr === 'string' ? JSON.parse(tr) : tr)
    } catch {}
    // col gap
    const g = db.settings.col_gap
    if (g !== undefined) {
      const gn = Number(g)
      setColGap(gn)
      document.documentElement.style.setProperty('--col-gap', gn + 'px')
    }
    // col divider
    const d = db.settings.col_divider
    if (d !== undefined) {
      const dn = d === '1' || d === true
      setColDivider(dn)
      document.documentElement.style.setProperty('--col-divider', dn ? '1' : '0')
    }
  }, [db.settings])

  // ── Apply font size ─────────────────────────────────────────
  useEffect(() => {
    const fs = fontSize + 'px'
    document.documentElement.style.setProperty('--fs', fs)
    document.documentElement.style.fontSize = fs
    document.body.style.fontSize = fs
  }, [fontSize])

  // ── Apply tab accent color ───────────────────────────────────
  useEffect(() => {
    const color = TAB_RAINBOW[tab] || 'var(--cc)'
    document.documentElement.style.setProperty('--tab-accent', color)
  }, [tab])

  // ── Persist active tab ───────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('gcomp_active_tab', tab) } catch {}
  }, [tab])

  // ── Tab bar touch-drag scroll ────────────────────────────────
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
    if (t === tab) {
      // Clicking the active tab resets to its home view — signal via key
      setTabResetKey(k => k + 1)
      return
    }
    setHistory(prev => [...prev.slice(0, histIdx + 1), tab])
    setHistIdx(prev => prev + 1)
    setTab(t)
  }, [tab, histIdx])

  const [tabResetKey, setTabResetKey] = useState(0)

  const goBack = useCallback(() => {
    if (histIdx >= 0) { setTab(history[histIdx]); setHistIdx(prev => prev - 1) }
  }, [history, histIdx])

  const goFwd = useCallback(() => {
    if (histIdx < history.length - 1) { setHistIdx(prev => prev + 1); setTab(history[histIdx + 1]) }
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

  const tabRainbowOn = !!tabRainbow[tab]
  const tabProps = { db, goTo, tab, rainbowOn: tabRainbowOn, colGap, colDivider, resetKey: tabResetKey }

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
      case 'dashboard':   return <Dashboard {...tabProps} key={tabResetKey} />
      case 'characters':  return <Characters {...tabProps} key={tabResetKey} />
      case 'wardrobe':    return <Wardrobe {...tabProps} key={tabResetKey} />
      case 'items':       return <Items {...tabProps} key={tabResetKey} />
      case 'locations':   return <Locations {...tabProps} key={tabResetKey} />
      case 'timeline':    return <Timeline {...tabProps} key={tabResetKey} />
      case 'scenes':      return <Scenes {...tabProps} key={tabResetKey} />
      case 'calendar':    return <CalendarTab {...tabProps} key={tabResetKey} />
      case 'tools':       return <Tools {...tabProps} key={tabResetKey} />
      case 'canon':       return <Canon {...tabProps} key={tabResetKey} />
      case 'world':       return <World {...tabProps} key={tabResetKey} />
      case 'questions':   return <Questions {...tabProps} key={tabResetKey} />
      case 'eras':        return <Eras {...tabProps} key={tabResetKey} />
      case 'spellings':   return <Spellings {...tabProps} key={tabResetKey} />
      case 'map':         return <MapTab {...tabProps} key={tabResetKey} />
      case 'wiki':        return <Wiki {...tabProps} key={tabResetKey} />
      case 'notes':       return <Notes {...tabProps} key={tabResetKey} />
      case 'journal':     return <Journal {...tabProps} key={tabResetKey} />
      case 'familytree':  return <FamilyTree {...tabProps} key={tabResetKey} />
      case 'flags':       return <Flags {...tabProps} key={tabResetKey} />
      case 'manuscript':  return <Manuscript {...tabProps} key={tabResetKey} />
      case 'sessionlog':  return <SessionLog {...tabProps} key={tabResetKey} />
      case 'inventory':   return <Inventory {...tabProps} key={tabResetKey} />
      default:            return <Dashboard {...tabProps} key={tabResetKey} />
    }
  }

  const headerImage = db.settings?.header_image || null

  return (
    <div>
      <nav className="nav">
        {/* ── Title bar ── */}
        <div className="nav-title-bar">
          <button className="nav-title-btn" onClick={() => goTo('dashboard')} title="Go to Dashboard">
            {headerImage
              ? <img src={headerImage} alt="Compendium Header" className="nav-title-img" />
              : <span className="nav-title-text">The Guardians of Lajen — Worldbuilding Compendium</span>
            }
          </button>
          <button className="nav-title-edit-btn" onClick={() => setSettingsOpen(true)} title="Settings">✏</button>
        </div>

        {/* ── Controls row ── */}
        <div className="nav-controls">
          <div className="nav-btns">
            <button className="nav-btn" onClick={goBack} title="Back">←</button>
            <button className="nav-btn" onClick={() => goTo('dashboard')} title="Home">⌂</button>
            <button className="nav-btn" onClick={goFwd} title="Forward">→</button>
          </div>

          <div className="nav-btns">
            <span
              className={`sync-dot ${db.syncStatus}`}
              title={`Sync: ${db.syncStatus}${db.hasSupabase ? '' : ' (local only)'}`}
              style={{ marginRight: 4 }}
            />
            <button className="nav-btn" onClick={() => adjFont(-1)} title="Smaller text">A−</button>
            <button className="nav-btn" onClick={() => adjFont(1)} title="Larger text">A+</button>
            <button
              className="nav-btn"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              style={{ fontSize: 13 }}
            >⚙</button>
            {/* Per-tab rainbow toggle */}
            {tab !== 'dashboard' && (
              <button
                className="nav-btn"
                title={tabRainbow[tab] ? 'Rainbow: On (click to turn off)' : 'Rainbow: Off (click to turn on)'}
                onClick={() => {
                  const next = { ...tabRainbow, [tab]: !tabRainbow[tab] }
                  setTabRainbow(next)
                  db.saveSetting('tab_rainbow', JSON.stringify(next))
                }}
                style={{
                  border: tabRainbow[tab] ? '1px solid #ff69b4' : '1px solid var(--brd)',
                  color: tabRainbow[tab] ? '#ff69b4' : 'var(--mut)',
                  fontSize: 14,
                }}
              >🌈</button>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="nav-btn" onClick={() => scrollTabs(-1)} style={{ flexShrink: 0 }}>◀</button>
          <div className="tabs-bar" ref={tabBarRef}>
            {TAB_ORDER.map(k => {
              const c = CATS[k]
              if (!c) return null
              const tabColor = TAB_RAINBOW[k] || 'var(--cc)'
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

      <div className="area">
        {renderTab()}
      </div>

      <IOBar db={db} backup={backup} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        db={db}
        tabRainbow={tabRainbow}
        setTabRainbow={setTabRainbow}
        colGap={colGap}
        setColGap={setColGap}
        colDivider={colDivider}
        setColDivider={setColDivider}
      />
    </div>
  )
}
