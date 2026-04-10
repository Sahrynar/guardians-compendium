import { useState, useCallback, useEffect, useRef } from 'react'
import { useDB } from './hooks/useDB'
import { useAutoBackup } from './hooks/useAutoBackup'
import { CATS, TAB_RAINBOW, uid } from './constants'

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
  const [navSearch, setNavSearch] = useState('')
  const [headerImg, setHeaderImg] = useState('')
  const [quickCapOpen, setQuickCapOpen] = useState(false)
  const [quickCapText, setQuickCapText] = useState('')
  const tabBarRef = useRef(null)
  const headerImgRef = useRef(null)
  const quickCapRef = useRef(null)

  useEffect(() => {
    if (!db.loading) {
      const img = db.settings?.dashboard_header_image || ''
      setHeaderImg(img)
    }
  }, [db.loading])

  useEffect(() => {
    const fs = fontSize + 'px'
    document.documentElement.style.setProperty('--fs', fs)
    document.documentElement.style.fontSize = fs
    document.body.style.fontSize = fs
  }, [fontSize])

  useEffect(() => {
    try { localStorage.setItem('gcomp_active_tab', tab) } catch {}
  }, [tab])

  // Focus quick capture input when opened
  useEffect(() => {
    if (quickCapOpen) setTimeout(() => quickCapRef.current?.focus(), 50)
  }, [quickCapOpen])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') { e.preventDefault(); setQuickCapOpen(o => !o) }
      if (e.key === 'Escape' && quickCapOpen) setQuickCapOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quickCapOpen])

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
    setNavSearch('') // clear search on tab change
  }, [tab, histIdx])

  const goBack = useCallback(() => {
    if (histIdx >= 0) { setTab(history[histIdx]); setHistIdx(prev => prev - 1); setNavSearch('') }
  }, [history, histIdx])

  const goFwd = useCallback(() => {
    if (histIdx < history.length - 1) { setHistIdx(prev => prev + 1); setTab(history[histIdx + 1]); setNavSearch('') }
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

  function handleHeaderImg(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target.result
      setHeaderImg(url)
      db.saveSetting('dashboard_header_image', url)
    }
    reader.readAsDataURL(file)
  }

  function removeHeaderImg() {
    setHeaderImg('')
    db.saveSetting('dashboard_header_image', '')
  }

  function submitQuickCap() {
    if (!quickCapText.trim()) return
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7)
    db.upsertEntry('journal_captures', {
      id,
      text: quickCapText.trim(),
      tag: 'unsorted',
      created: new Date().toISOString(),
      color: 'yellow',
      size: 'normal',
      pinned: false,
    })
    setQuickCapText('')
    setQuickCapOpen(false)
  }

  const tabProps = { db, goTo, tab, navSearch, setNavSearch }

  function renderTab() {
    if (db.loading) return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)' }}>
        <div style={{ fontSize: '3.69em', marginBottom: 12 }}>✦</div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.08em' }}>
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
      case 'tools':      return <Tools {...tabProps} />
      case 'canon':      return <Canon {...tabProps} />
      case 'world':      return <World {...tabProps} />
      case 'questions':  return <Questions {...tabProps} />
      case 'eras':       return <Eras {...tabProps} />
      case 'spellings':  return <Spellings {...tabProps} />
      case 'map':        return <MapTab {...tabProps} />
      case 'wiki':       return <Wiki {...tabProps} />
      case 'notes':      return <Notes {...tabProps} />
      case 'journal':    return <Journal {...tabProps} />
      case 'familytree': return <FamilyTree {...tabProps} />
      case 'flags':      return <Flags {...tabProps} />
      case 'manuscript': return <Manuscript {...tabProps} />
      case 'inventory':  return <Inventory {...tabProps} />
      case 'glossary':   return <Glossary {...tabProps} />
      case 'sessionlog': return <SessionLog {...tabProps} />
      default:           return <Dashboard {...tabProps} />
    }
  }

  const tabName = tab === 'familytree' ? 'family tree' : tab === 'sessionlog' ? 'session log' :
    tab === 'eras' ? 'eras' : tab === 'map' ? 'maps' : tab

  return (
    <div>
      {/* Header */}
      <div className="site-header" onClick={() => goTo('dashboard')} style={{ cursor: 'pointer', position: 'relative' }}>
        {headerImg ? (
          <div style={{ position: 'relative' }}>
            <img src={headerImg} alt="header" style={{ width: '100%', height: 'auto', display: 'block' }} />
            <div className="header-corner-zone">
              <button className="header-corner-btn" onClick={e => { e.stopPropagation(); headerImgRef.current?.click() }} title="Change header image">✎</button>
              <button className="header-corner-btn" onClick={e => { e.stopPropagation(); removeHeaderImg() }} title="Remove image">✕</button>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', padding: '10px 16px 8px', textAlign: 'center' }}>
            <span style={{
              fontFamily: "'WizardOfTheMoon', 'Cinzel', serif",
              fontSize: '3.69em',
              background: 'linear-gradient(90deg,#ff69b4,#ff6b6b,#ff8c00,#ffd600,#38b000,#00b4d8,#4361ee,#9d4edd,#c77dff,#ff48c4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              letterSpacing: '.02em', display: 'inline-block', lineHeight: 1.2,
            }}>
              The Guardians of Lajen — Worldbuilding Compendium
            </span>
            <div className="header-corner-zone">
              <button className="header-corner-btn" onClick={e => { e.stopPropagation(); headerImgRef.current?.click() }} title="Upload header image">✎</button>
            </div>
          </div>
        )}
      </div>

      <input ref={headerImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeaderImg} />

      {/* Nav */}
      <nav className="nav">
        <div className="nav-top">
          <div className="nav-btns">
            <button className="nav-btn" onClick={goBack} title="Back">←</button>
            <button className="nav-btn" onClick={() => goTo('dashboard')} title="Home">⌂</button>
            <button className="nav-btn" onClick={goFwd} title="Forward">→</button>
          </div>
          <input
            className="sx nav-search"
            placeholder={tab === 'dashboard' ? 'Search everything…' : `Search ${tabName}…`}
            value={navSearch}
            onChange={e => setNavSearch(e.target.value)}
          />
          <div className="nav-btns">
            <span className={`sync-dot ${db.syncStatus}`} title={`Sync: ${db.syncStatus}`} style={{ marginRight: 4 }} />
            <button className="nav-btn" onClick={() => adjFont(-1)} title="Smaller text">A−</button>
            <button className="nav-btn" onClick={() => adjFont(1)} title="Larger text">A+</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="nav-btn" onClick={() => scrollTabs(-1)} style={{ flexShrink: 0 }}>◀</button>
          <div className="tabs-bar" id="tabBar" ref={tabBarRef}>
            {TAB_ORDER.map(k => {
              const c = CATS[k]
              if (!c) return null
              const tabHex = TAB_RAINBOW[k] || '#aaaaaa'
              const isActive = tab === k
              return (
                <button key={k} className="tab-btn"
                  style={{
                    borderColor: tabHex,
                    color: isActive ? (k === 'dashboard' ? '#1a1a2e' : '#ffffff') : tabHex,
                    background: isActive ? tabHex : 'transparent',
                    opacity: isActive ? 1 : 0.55,
                    fontWeight: isActive ? 700 : 600,
                  }}
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

      <div className="area">{renderTab()}</div>

      {/* Floating Quick Capture button */}
      <button
        onClick={() => setQuickCapOpen(o => !o)}
        title="Quick Capture (Ctrl+Q)"
        style={{
          position: 'fixed', bottom: 56, right: 16, zIndex: 120,
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg,#9d4edd,#c77dff)',
          border: 'none', color: '#fff', fontSize: '1.38em',
          cursor: 'pointer', boxShadow: '0 2px 12px rgba(157,78,221,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >✦</button>

      {/* Quick Capture popup */}
      {quickCapOpen && (
        <div style={{
          position: 'fixed', bottom: 108, right: 16, zIndex: 121,
          background: 'var(--sf)', border: '1px solid #9d4edd',
          borderRadius: 'var(--rl)', padding: 14, width: 280,
          boxShadow: '0 4px 24px rgba(0,0,0,.5)',
        }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '0.85em', color: '#9d4edd', marginBottom: 8 }}>
            ✦ Quick Capture → Journal
          </div>
          <textarea
            ref={quickCapRef}
            value={quickCapText}
            onChange={e => setQuickCapText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitQuickCap() }}
            placeholder="Capture a thought…"
            style={{
              width: '100%', minHeight: 70, padding: '6px 8px',
              background: 'var(--card)', border: '1px solid var(--brd)',
              borderRadius: 'var(--r)', color: 'var(--tx)', fontSize: '0.92em',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setQuickCapOpen(false); setQuickCapText('') }}>Cancel</button>
            <button className="btn btn-sm" style={{ background: '#9d4edd', color: '#fff' }} onClick={submitQuickCap}>
              Save (Ctrl+↵)
            </button>
          </div>
        </div>
      )}

      <IOBar db={db} backup={backup} />
    </div>
  )
}
