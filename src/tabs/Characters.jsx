import { useState, useRef, useEffect, useCallback } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { CHAR_FIELDS, highlight, SL, uid, hexToRgba, lerpColor } from '../constants'

const PRESET_LABELS = [
  { key: 'generic_male_no_wings',    label: 'Generic Male — No Wings' },
  { key: 'generic_female_no_wings',  label: 'Generic Female — No Wings' },
  { key: 'generic_male_wings',       label: 'Generic Male — Wings' },
  { key: 'generic_female_wings',     label: 'Generic Female — Wings' },
  { key: 'martyn_no_wings',          label: 'Martyn — No Wings' },
  { key: 'lila_no_wings',            label: 'Lila — No Wings' },
  { key: 'martyn_wings',             label: 'Martyn — Wings' },
  { key: 'lila_wings',               label: 'Lila — Wings' },
]

const PALETTE = [
  '#ff0000','#ff3300','#ff6600','#ff9900','#ffcc00','#ffff00','#ccff00','#99ff00','#66ff00','#33ff00',
  '#00ff00','#00ff33','#00ff66','#00ff99','#00ffcc','#00ffff','#00ccff','#0099ff','#0066ff','#0033ff',
  '#0000ff','#3300ff','#6600ff','#9900ff','#cc00ff','#ff00ff','#ff00cc','#ff0099','#ff0066','#ff0033',
  '#ffffff','#eeeeee','#dddddd','#cccccc','#bbbbbb','#aaaaaa','#888888','#666666','#444444','#222222',
  '#000000','#1a0a00','#3d1a00','#6b2d00','#994400','#c45c00','#e87800','#f0a030','#f5c878','#fae4b8',
  '#001a00','#003300','#005500','#007700','#009900','#00bb00','#33cc33','#66dd66','#99ee99','#ccffcc',
  '#00001a','#000033','#000055','#000077','#000099','#0000bb','#3333cc','#6666dd','#9999ee','#ccccff',
  '#1a001a','#330033','#550055','#770077','#990099','#bb00bb','#cc33cc','#dd66dd','#ee99ee','#ffccff',
  '#c966ff','#ff7040','#00e5cc','#3388ff','#ffaa33','#ff3355','#ffcc00','#7acc7a','#66bbff','#e577ff',
  '#8B4513','#A0522D','#D2691E','#DEB887','#F4A460','#DAA520','#B8860B','#CD853F','#D2B48C','#FFDEAD',
]

// ── Deceased status — uses proper field first, falls back to notes text ──
function isDeceased(e) {
  // Proper field takes priority
  if (e.deceased === 'Yes') return true
  if (e.deceased === 'No') return false
  if (e.deceased === 'Unknown') return null
  // Fall back to legacy notes parsing
  const n = (e.notes || '').toLowerCase()
  if (n.includes('deceased: true')) return true
  if (n.includes('deceased: false')) return false
  return null
}

function diesIn(e) {
  // Proper field takes priority
  if (e.dies_in) return e.dies_in
  // Fall back to legacy notes parsing
  const m = (e.notes || '').match(/dies_in:\s*([^\n.]+)/i)
  return m ? m[1].trim() : null
}

// Book order for "already dead by this book" check
const BOOK_ORDER = ['Before Series','Pre-Series','Book 1','Book 2','Book 3','Book 4','Book 5','Future']
function isDeadByBook(e, filterBook) {
  if (!filterBook || filterBook === 'all') return isDeceased(e) === true
  const di = diesIn(e)
  if (!di) return false
  const diIdx = BOOK_ORDER.findIndex(b => di.toLowerCase().includes(b.toLowerCase().replace('book ', 'book')))
  const fbIdx = BOOK_ORDER.findIndex(b => b.toLowerCase() === filterBook.toLowerCase())
  if (diIdx === -1 || fbIdx === -1) return isDeceased(e) === true
  return diIdx <= fbIdx
}

export default function Characters({ db, goToWithSearch, crossLink, clearCrossLink }) {
  const chars = db.db.characters || []
  const [search, setSearch] = useState('')
  const [colCount, setColCount] = useState(() => parseInt(db.getSetting?.('char_cols') || '3'))

  // Consume crossLink on mount (e.g. arriving from a scene click or dashboard)
  useEffect(() => {
    if (crossLink?.search) {
      setSearch(crossLink.search)
      // Prefer exact ID match, fall back to name match
      if (crossLink.expandId) {
        setExpanded(crossLink.expandId)
      } else if (crossLink.expandName) {
        const match = chars.find(c =>
          (c.name || c.display_name || '').toLowerCase() === crossLink.expandName.toLowerCase()
        )
        if (match) setExpanded(match.id)
      }
      clearCrossLink?.()
    }
  }, [crossLink])

  const [dividers, setDividers] = useState(() => db.getSetting?.('char_cols_div') !== 'off')
  function toggleDividers() { const next = !dividers; setDividers(next); db.saveSetting?.('char_cols_div', next ? 'on' : 'off') }
  function saveColCount(n) { setColCount(n); db.saveSetting?.('char_cols', String(n)) }
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [portraitCharId, setPortraitCharId] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [filterDeceased, setFilterDeceased] = useState('all')
  const [filterElement, setFilterElement] = useState('all')
  const [filterBook, setFilterBook] = useState('all')
  const [sortMode, setSortMode] = useState('alpha')

  // filterDeceased can be 'all', 'alive', 'deceased', or a book name like 'Book 1'
  const filtered = chars.filter(e => {
    if (search && !JSON.stringify(e).toLowerCase().includes(search.toLowerCase())) return false
    if (filterDeceased === 'alive') {
      if (isDeceased(e) === true) return false
    } else if (filterDeceased === 'deceased') {
      if (isDeceased(e) !== true) return false
    }
    if (filterElement !== 'all' && (e.element || '') !== filterElement) return false
    if (filterBook !== 'all' && !(e.books || []).includes(filterBook) && (e.first_book || '') !== filterBook) return false
    return true
  }).sort((a, b) => {
    if (sortMode === 'alpha') return (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')
    if (sortMode === 'zalpha') return (b.display_name || b.name || '').localeCompare(a.display_name || a.name || '')
    if (sortMode === 'element') return (a.element || '').localeCompare(b.element || '')
    if (sortMode === 'status') return (a.status || '').localeCompare(b.status || '')
    if (sortMode === 'birthday') {
      const pa = parseInt(a.birthday_lajen || '0') || 0
      const pb = parseInt(b.birthday_lajen || '0') || 0
      return pa - pb
    }
    if (sortMode === 'book') return (a.first_book || '').localeCompare(b.first_book || '')
    if (sortMode === 'newest') return new Date(b.created || 0) - new Date(a.created || 0)
    return 0
  })

  function handleSave(entry) {
    // Duplicate detection — warn on new entries only
    if (!editing?.id) {
      const newName = (entry.name || '').toLowerCase().trim()
      const dupe = chars.find(c =>
        c.id !== entry.id &&
        (c.name || '').toLowerCase().trim() === newName
      )
      if (dupe && !window.confirm(`A character named "${dupe.name}" already exists. Save anyway?`)) return
    }
    if (!editing?.id && entry.birthday_lajen) {
      const existing = (db.db.timeline||[]).find(t => t.name === 'Birthday: ' + entry.name)
      if (!existing) {
        db.upsertEntry('timeline', {
          id: uid(), name: 'Birthday: ' + entry.name,
          date_hc: entry.birthday_lajen, sort_order: '', era: '',
          detail: 'Auto-created from character birthday',
          status: 'locked', books: [], relationships: [],
          created: new Date().toISOString()
        })
      }
    }
    db.upsertEntry('characters', entry)
    setModalOpen(false); setEditing(null)
    setExpanded(entry.id)
  }

  function badges(e) {
    const parts = []
    if (e.status) parts.push(<span key="s" className={`badge badge-${e.status}`}>{SL[e.status]}</span>)
    ;(e.books||[]).forEach(b => parts.push(<span key={b} className="badge badge-book">{b}</span>))
    if (e.flagged) parts.push(<span key="f" className="badge badge-flag">🚩</span>)
    // Deceased badge — always note fate, but style depends on whether dead yet in current view
    const dead = isDeceased(e)
    const di = diesIn(e)
    if (dead === true || di) {
      const alreadyDead = dead === true // shows as deceased regardless of filter
      parts.push(
        <span key="dead" style={{
          fontSize: '0.69em', padding: '1px 5px', borderRadius: 4, marginLeft: 2,
          background: alreadyDead ? 'rgba(255,51,85,.15)' : 'rgba(100,100,120,.15)',
          color: alreadyDead ? '#ff3355' : 'var(--dim)',
          border: `1px solid ${alreadyDead ? 'rgba(255,51,85,.3)' : 'var(--brd)'}`,
        }}>
          {alreadyDead ? '† ' : '⚠ '}{di || 'Deceased'}
        </span>
      )
    }
    // Wings badge
    if (e.has_wings === 'Yes') {
      parts.push(
        <span key="wings" style={{ fontSize: '0.69em', padding: '1px 5px', borderRadius: 4, background: 'rgba(201,102,255,.15)', color: 'var(--cl)', border: '1px solid rgba(201,102,255,.3)', marginLeft: 2 }}>
          🪽 Wings
        </span>
      )
    }
    return parts
  }

  function colorSwatches(e) {
    const defs = [
      ['hair_color','Hair'],
      ['eye_color','Eyes'],
      ['skin_color','Skin'],
      ['aura_color','Aura'],
      ['clothing_color','Clothing'],
    ]
    // Only show wing colour if character has wings
    if (e.has_wings === 'Yes') defs.push(['wing_color','Wings'])

    return defs
      .filter(([k]) => e[k] && e[k] !== '#888888')
      .map(([k, lbl]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: e[k], border: '1px solid rgba(255,255,255,.2)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.69em', color: 'var(--dim)' }}>{lbl}</span>
        </div>
      ))
  }

  const aliveCount    = chars.filter(e => isDeceased(e) === false).length
  const deceasedCount = chars.filter(e => isDeceased(e) === true).length

  return (
    <div>
      <div className="tbar">
        <div style={{ display:'flex', gap:3, marginRight:'auto' }}>
          {[['XS',8],['S',5],['M',3],['L',2],['XL',1]].map(([l,n]) => (
            <button key={l} onClick={() => saveColCount(n)}
              style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8,
                background: colCount===n ? 'var(--cc)' : 'none',
                color: colCount===n ? '#000' : 'var(--dim)',
                border: `1px solid ${colCount===n ? 'var(--cc)' : 'var(--brd)'}`,
                cursor:'pointer' }}>{l}</button>
          ))}
        
        <button onClick={toggleDividers}
          style={{ fontSize: '0.69em', padding:'2px 7px', borderRadius:8, marginLeft:8,
            background: dividers ? 'rgba(255,255,255,.08)' : 'none',
            color: dividers ? 'var(--tx)' : 'var(--mut)',
            border:'1px solid var(--brd)', cursor:'pointer' }}>
          {dividers ? '┃ on' : '┃ off'}
        </button>
        </div>
        <input className="sx" placeholder="Search characters…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={sortMode} onChange={e => setSortMode(e.target.value)}
          style={{ fontSize:'0.77em', padding:'3px 8px', borderRadius:6, border:'1px solid var(--brd)', background:'var(--sf)', color:'var(--dim)', cursor:'pointer' }}>
          <option value="alpha">A → Z</option>
          <option value="zalpha">Z → A</option>
          <option value="element">Element</option>
          <option value="status">Status</option>
          <option value="birthday">Birthday</option>
          <option value="book">First Book</option>
          <option value="newest">Newest</option>
        </select>
        {/* Element filter */}
        <select value={filterElement} onChange={e => setFilterElement(e.target.value)}
          style={{ fontSize:'0.77em', padding:'3px 8px', borderRadius:6, border:'1px solid var(--brd)', background:'var(--sf)', color:'var(--dim)', cursor:'pointer' }}>
          <option value="all">All Elements</option>
          <option value="Water">💧 Water</option>
          <option value="Fire">🔥 Fire</option>
          <option value="Earth">🌿 Earth</option>
          <option value="Air">💨 Air</option>
        </select>
        {/* Book filter */}
        <select value={filterBook} onChange={e => setFilterBook(e.target.value)}
          style={{ fontSize:'0.77em', padding:'3px 8px', borderRadius:6, border:'1px solid var(--brd)', background:'var(--sf)', color:'var(--dim)', cursor:'pointer' }}>
          <option value="all">All Books</option>
          <option value="Pre-Series">Pre-Series</option>
          <option value="Book 1">Book 1</option>
          <option value="Book 2">Book 2</option>
          <option value="Book 3">Book 3</option>
          <option value="Book 4">Book 4</option>
          <option value="Book 5">Book 5</option>
        </select>
        {/* Alive/Deceased filter */}
        <div style={{ display: 'flex', gap: 3 }}>
          {[['all','All'], ['alive','Alive'], ['deceased','†']].map(([v, l]) => (
            <button key={v}
              style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
                background: filterDeceased === v ? 'var(--cc)' : 'none',
                color: filterDeceased === v ? '#000' : 'var(--dim)',
                border: `1px solid ${filterDeceased === v ? 'var(--cc)' : 'var(--brd)'}` }}
              onClick={() => setFilterDeceased(v)}>
              {l}{v === 'alive' && aliveCount > 0 ? ` (${aliveCount})` : ''}{v === 'deceased' && deceasedCount > 0 ? ` (${deceasedCount})` : ''}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: colCount > 1 ? `repeat(${colCount}, 1fr)` : '1fr', columnGap: 12, gap: 8, width: '100%' }}>
        {!filtered.length && (
          <div className="empty"><div className="empty-icon">👤</div><p>No characters yet.</p>
            <button className="btn btn-primary" style={{ background: 'var(--cc)' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Character</button>
          </div>
        )}
        {filtered.map((e, i) => {
          const isOpen = expanded === e.id
          const hasPortrait = !!(e.portrait_canvas)
          const hasRef = !!(e.reference_image)
          const hasColors = ['hair_color','eye_color','skin_color','aura_color','clothing_color'].some(k => e[k] && e[k] !== '#888888')
            || (e.has_wings === 'Yes' && e.wing_color && e.wing_color !== '#888888')
          const dead = isDeceased(e)

          return (
            <div key={e.id} className="entry-card" style={{ breakInside: 'avoid', marginBottom: 6, '--card-color': 'var(--cc)', background: dead === true ? 'rgba(255,51,85,.03)' : i%2===1 ? 'rgba(255,255,255,.01)' : undefined, opacity: dead === true ? 0.8 : 1 }}
              onClick={() => setExpanded(isOpen?null:e.id)}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  {dead === true && <span style={{ fontSize: '0.85em', color: '#ff3355', flexShrink: 0 }} title="Deceased">†</span>}
                  <div className="entry-title" dangerouslySetInnerHTML={{ __html: highlight(e.display_name||e.name||'', search) }} />
                </div>
                {hasPortrait && (
                  <img src={e.portrait_canvas} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--brd)', marginLeft: 8, flexShrink: 0, cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); setLightboxSrc(e.portrait_canvas) }} />
                )}
              </div>
              <div className="entry-meta">{badges(e)}</div>

              {isOpen && (
                <>
                  {(hasPortrait || hasRef || hasColors) && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '8px 0', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        {hasPortrait ? (
                          <div>
                            <img src={e.portrait_canvas} alt="Portrait"
                              style={{ width: 100, height: 'auto', borderRadius: 'var(--r)', border: '1px solid var(--cc)', cursor: 'zoom-in' }}
                              onClick={ev => { ev.stopPropagation(); setLightboxSrc(e.portrait_canvas) }}
                            />
                            <div style={{ fontSize: '0.62em', color: 'var(--cc)', marginTop: 2, cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); setPortraitCharId(e.id) }}>🎨 Edit</div>
                          </div>
                        ) : (
                          <div style={{ width: 80, height: 80, border: '1px dashed var(--brd)', borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--mut)', fontSize: '0.69em', cursor: 'pointer', gap: 2 }}
                            onClick={ev => { ev.stopPropagation(); setPortraitCharId(e.id) }}>🎨<span>Portrait</span></div>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {hasRef ? (
                          <div>
                            <img src={e.reference_image} alt="Reference"
                              style={{ maxWidth: 100, maxHeight: 130, borderRadius: 'var(--r)', border: '1px solid var(--brh)', objectFit: 'contain', cursor: 'zoom-in' }}
                              onClick={ev => { ev.stopPropagation(); setLightboxSrc(e.reference_image) }}
                            />
                            <div style={{ display: 'flex', gap: 4, marginTop: 2, justifyContent: 'center' }}>
                              <label style={{ fontSize: '0.62em', color: 'var(--dim)', cursor: 'pointer' }}>📎
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={ev => { const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e2=>{db.upsertEntry('characters',{...e,reference_image:e2.target.result})};r.readAsDataURL(f) }} />
                              </label>
                              <span style={{ fontSize: '0.62em', color: '#ff3355', cursor: 'pointer' }} onClick={ev => { ev.stopPropagation(); db.upsertEntry('characters',{...e,reference_image:null}) }}>✕</span>
                            </div>
                          </div>
                        ) : (
                          <label style={{ width: 80, height: 80, border: '1px dashed var(--brd)', borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--mut)', fontSize: '0.69em', cursor: 'pointer', gap: 2 }}>
                            🖼<span>Reference</span>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={ev => { ev.stopPropagation(); const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e2=>{db.upsertEntry('characters',{...e,reference_image:e2.target.result})};r.readAsDataURL(f) }} />
                          </label>
                        )}
                      </div>
                      {hasColors && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                          {colorSwatches(e)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="entry-detail">
                    {CHAR_FIELDS.filter(f => {
                      const skip = ['name','hair_color','eye_color','skin_color','aura_color','clothing_color','wing_color']
                      // hide wing_color if no wings; hide has_wings if No/empty
                      if (f.k === 'wing_color' && e.has_wings !== 'Yes') return false
                      return !skip.includes(f.k) && e[f.k]
                    }).map(f => (
                      <div key={f.k} style={{ marginBottom: 3 }}>
                        <strong style={{ color: 'var(--cc)', fontSize: '0.69em', textTransform: 'uppercase' }}>{f.l}: </strong>
                        {f.k === 'has_wings'
                          ? <span>{e[f.k]} {e[f.k] === 'Yes' && e.wing_color && e.wing_color !== '#888888' ? <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:e.wing_color, border:'1px solid rgba(255,255,255,.3)', verticalAlign:'middle', marginLeft:3 }} /> : null}</span>
                          : String(e[f.k])
                        }
                      </div>
                    ))}

                    {/* Deceased info from notes */}
                    {dead === true && (
                      <div style={{ marginBottom: 3, color: '#ff3355', fontSize: '0.77em' }}>
                        <strong style={{ fontSize: '0.69em', textTransform: 'uppercase' }}>Status: </strong>
                        † Deceased{diesIn(e) ? ` — ${diesIn(e)}` : ''}
                      </div>
                    )}

                    {(() => {
                      const myItems = (db.db.items||[]).filter(it =>
                        it.holder === e.id ||
                        (it.shared_with === e.id) ||
                        (it.holder && typeof it.holder === 'string' &&
                          it.holder.toLowerCase() === (e.name||'').toLowerCase())
                      )
                      if (!myItems.length) return null
                      return (
                        <div style={{ marginTop: 8 }} onClick={ev => ev.stopPropagation()}>
                          <div style={{ fontSize: '0.77em', color: 'var(--ci)', fontWeight: 700,
                            marginBottom: 6 }}>⚔ Items & Weapons</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {myItems.map(it => (
                              <div key={it.id} style={{ background: 'var(--card)',
                                border: '1px solid var(--brd)', borderRadius: 7,
                                padding: 6, minWidth: 80, maxWidth: 120,
                                cursor: 'pointer', position: 'relative' }}
                                title={it.name}
                                onClick={ev => { ev.stopPropagation() }}>
                                {it.image && (
                                  <img src={it.image} alt={it.name}
                                    style={{ width: '100%', height: 50, objectFit: 'cover',
                                      borderRadius: 4, marginBottom: 3, display: 'block' }}
                                    onError={e => e.target.style.display='none'} />
                                )}
                                {(it.transfers||[]).length > 0 && (
                                  <span style={{ position: 'absolute', top: 3, right: 3,
                                    fontSize: '0.62em', color: 'var(--sp)', background: 'rgba(0,0,0,.5)',
                                    padding: '1px 3px', borderRadius: 3 }}>↔</span>
                                )}
                                <div style={{ fontSize: '0.69em', fontWeight: 600,
                                  color: 'var(--tx)', lineHeight: 1.2 }}>{it.name}</div>
                                {it.item_type && (
                                  <div style={{ fontSize: '0.62em', color: 'var(--ci)',
                                    textTransform: 'uppercase' }}>{it.item_type}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {(() => {
                      const myWR = (db.db.wardrobe||[]).filter(w => w.character === e.id)
                      if (!myWR.length) return null
                      return (
                        <details style={{ marginTop: 6 }} onClick={ev => ev.stopPropagation()}>
                          <summary style={{ fontSize: '0.77em', color: 'var(--cwr)', cursor: 'pointer' }}>Wardrobe ({myWR.length})</summary>
                          {myWR.map(w => <div key={w.id} style={{ fontSize: '0.77em', color: 'var(--dim)', padding: '2px 0' }}>{w.item_type && <span style={{ color: 'var(--cwr)' }}>{w.item_type} </span>}{w.name}</div>)}
                        </details>
                      )
                    })()}

                    {(() => {
                      const mySc = (db.db.scenes||[]).filter(s => (s.characters_present||'').toLowerCase().includes((e.name||'').toLowerCase()))
                      if (!mySc.length) return null
                      return (
                        <details style={{ marginTop: 4 }} onClick={ev => ev.stopPropagation()}>
                          <summary style={{ fontSize: '0.77em', color: 'var(--csc)', cursor: 'pointer' }}>Scenes ({mySc.length})</summary>
                          {mySc.map(s => (
                            <div key={s.id} style={{ fontSize: '0.77em', color: 'var(--dim)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {s.book && <span style={{ color: 'var(--csc)' }}>{s.book} </span>}
                              <button
                                onClick={ev => { ev.stopPropagation(); goToWithSearch?.('scenes', s.name) }}
                                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--dim)', cursor: 'pointer', fontSize: '0.77em', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'rgba(102,187,255,.4)' }}
                                title="Jump to this scene"
                              >{s.name}</button>
                            </div>
                          ))}
                        </details>
                      )
                    })()}
                  </div>

                  {e.notes && <div className="entry-notes">{e.notes}</div>}

                  {(e.updated_at || e.updated || e.created) && (
                    <div className="entry-timestamp">
                      {e.updated_at || e.updated
                        ? `Edited ${new Date(e.updated_at || e.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Added ${new Date(e.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </div>
                  )}
                  <div className="entry-actions">
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--cc)', borderColor: 'var(--cc)' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--cq)', borderColor: 'var(--cq)' }} onClick={ev => { ev.stopPropagation(); setPortraitCharId(e.id) }}>🎨 Portrait</button>
                    <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id?'Edit':'Add'} Character`} color="var(--cc)">
        <EntryForm fields={CHAR_FIELDS} entry={editing||{}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--cc)" db={db} />
      </Modal>

      {portraitCharId && (
        <PortraitTool charId={portraitCharId} db={db} onClose={() => setPortraitCharId(null)} palette={PALETTE} presetLabels={PRESET_LABELS} />
      )}

      {lightboxSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '1.85em', cursor: 'pointer' }} onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{chars.find(e=>e.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('characters',confirmId); setConfirmId(null); if(expanded===confirmId) setExpanded(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PORTRAIT TOOL
// ══════════════════════════════════════════════════════
function PortraitTool({ charId, db, onClose, palette, presetLabels }) {
  const ch = (db.db.characters||[]).find(c => c.id === charId)
  const canvasRef = useRef()
  const [fillMode, setFillMode] = useState('flat')
  const [flatColor, setFlatColor] = useState('#c966ff')
  const [tolerance, setTolerance] = useState(32)
  const [history, setHistory] = useState([])
  const [gradStops, setGradStops] = useState([{ pos: 0, color: '#c966ff' }, { pos: 1, color: '#ff7040' }])
  const [gradAngle, setGradAngle] = useState(90)
  const [gradType, setGradType] = useState('linear')
  const [selectedStop, setSelectedStop] = useState(0)
  const [savedGrads, setSavedGrads] = useState(() => { try { return JSON.parse(db.getSetting?.('char_gradients') || localStorage.getItem('gcomp_gradients') || '[]') } catch { return [] } })
  const [recentColors, setRecentColors] = useState(() => { try { return JSON.parse(db.getSetting?.('char_recent_colors') || localStorage.getItem('gcomp_recent_colors') || '[]') } catch { return [] } })
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState('base')
  const [presetSrcs, setPresetSrcs] = useState(() => { try { return JSON.parse(db.getSetting?.('char_preset_imgs') || localStorage.getItem('gcomp_preset_imgs') || '{}') } catch { return {} } })

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ch?.portrait_canvas) {
      const img = new Image()
      img.onload = () => { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0) }
      img.src = ch.portrait_canvas
    }
  }, [])

  function loadBase(src) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const img = new Image()
    img.onload = () => { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); setHistory([]) }
    img.src = src
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)
    setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)].slice(-20))
    if (fillMode === 'flat') { floodFill(ctx, canvas, x, y, hexToRgba(flatColor)); addRecentColor(flatColor) }
    else { floodFillGradient(ctx, canvas, x, y) }
  }

  function addRecentColor(c) {
    setRecentColors(prev => {
      const next = [c, ...prev.filter(x => x !== c)].slice(0, 20)
      db.saveSetting?.('char_recent_colors', JSON.stringify(next))
      return next
    })
  }

  function floodFill(ctx, canvas, sx, sy, fillColor) {
    const w = canvas.width, h = canvas.height
    const imgData = ctx.getImageData(0, 0, w, h); const d = imgData.data
    const idx = (x, y) => (y * w + x) * 4
    const si = idx(sx, sy)
    const target = [d[si], d[si+1], d[si+2], d[si+3]]
    const colorDist = i => Math.abs(d[i]-target[0]) + Math.abs(d[i+1]-target[1]) + Math.abs(d[i+2]-target[2])
    if (colorDist(si) < 4) return
    const visited = new Uint8Array(w * h); const stack = [[sx, sy]]
    while (stack.length) {
      const [x, y] = stack.pop()
      if (x<0||x>=w||y<0||y>=h||visited[y*w+x]) continue
      const i = idx(x, y)
      if (colorDist(i) > tolerance) continue
      visited[y*w+x] = 1
      d[i]=fillColor[0]; d[i+1]=fillColor[1]; d[i+2]=fillColor[2]; d[i+3]=255
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])
    }
    ctx.putImageData(imgData, 0, 0)
  }

  function getGradColorAt(pos) {
    const sorted = [...gradStops].sort((a,b) => a.pos - b.pos)
    if (pos <= sorted[0].pos) return sorted[0].color
    if (pos >= sorted[sorted.length-1].pos) return sorted[sorted.length-1].color
    for (let i = 0; i < sorted.length-1; i++) {
      if (pos >= sorted[i].pos && pos <= sorted[i+1].pos) {
        const t = (pos - sorted[i].pos) / (sorted[i+1].pos - sorted[i].pos)
        return lerpColor(sorted[i].color, sorted[i+1].color, t)
      }
    }
    return '#ffffff'
  }

  function floodFillGradient(ctx, canvas, sx, sy) {
    const w = canvas.width, h = canvas.height
    const imgData = ctx.getImageData(0, 0, w, h); const d = imgData.data
    const idx = (x, y) => (y * w + x) * 4
    const si = idx(sx, sy)
    const target = [d[si], d[si+1], d[si+2], d[si+3]]
    const colorDist = i => Math.abs(d[i]-target[0]) + Math.abs(d[i+1]-target[1]) + Math.abs(d[i+2]-target[2])
    const visited = new Uint8Array(w * h); const stack = [[sx, sy]]; const region = []
    let minX=w, maxX=0, minY=h, maxY=0
    while (stack.length) {
      const [x, y] = stack.pop()
      if (x<0||x>=w||y<0||y>=h||visited[y*w+x]) continue
      const i = idx(x, y)
      if (colorDist(i) > tolerance) continue
      visited[y*w+x] = 1; region.push([x,y])
      if (x<minX) minX=x; if (x>maxX) maxX=x; if (y<minY) minY=y; if (y>maxY) maxY=y
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])
    }
    if (!region.length) return
    const rw = Math.max(1, maxX-minX), rh = Math.max(1, maxY-minY)
    const ang = (gradAngle * Math.PI) / 180
    const cosA = Math.cos(ang), sinA = Math.sin(ang)
    region.forEach(([x, y]) => {
      let t
      if (gradType === 'radial') {
        const cx=(minX+maxX)/2, cy=(minY+maxY)/2
        const maxR = Math.sqrt((rw/2)**2 + (rh/2)**2) || 1
        t = Math.min(1, Math.sqrt((x-cx)**2 + (y-cy)**2) / maxR)
      } else {
        const nx=(x-minX)/rw, ny=(y-minY)/rh
        t = Math.max(0, Math.min(1, (nx*cosA + ny*sinA + 1) / 2))
      }
      const col = hexToRgba(getGradColorAt(t))
      const i = idx(x, y)
      d[i]=col[0]; d[i+1]=col[1]; d[i+2]=col[2]; d[i+3]=255
    })
    ctx.putImageData(imgData, 0, 0)
  }

  function undo() {
    if (!history.length) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.putImageData(history[history.length-1], 0, 0)
    setHistory(h => h.slice(0,-1))
  }

  function reset() {
    setHistory([])
    db.upsertEntry('characters', { ...ch, portrait_canvas: null })
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d', { willReadFrequently: true }).clearRect(0, 0, canvas.width, canvas.height)
  }

  function savePortrait() {
    const canvas = canvasRef.current
    if (!canvas) { onClose(); return }
    db.upsertEntry('characters', { ...ch, portrait_canvas: canvas.toDataURL('image/png') })
    onClose()
  }

  function uploadPreset(key, e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      const updated = { ...presetSrcs, [key]: ev.target.result }
      setPresetSrcs(updated)
      db.saveSetting?.('char_preset_imgs', JSON.stringify(updated))
    }
    r.readAsDataURL(f)
  }

  function saveGradient() {
    const name = prompt('Gradient name:'); if (!name) return
    const updated = [...savedGrads, { name, stops: gradStops, angle: gradAngle, type: gradType }]
    setSavedGrads(updated); db.saveSetting?.('char_gradients', JSON.stringify(updated))
  }

  if (!ch) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 10px', overflowY: 'auto' }}>
      <div style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', width: '100%', maxWidth: 640, padding: 18, position: 'relative' }}>
        <button style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: 'var(--dim)', fontSize: '1.38em', cursor: 'pointer' }} onClick={onClose}>✕</button>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', marginBottom: 12, color: 'var(--cc)' }}>🎨 Portrait — {ch.name}</h2>

        <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--brd)', paddingBottom: 8 }}>
          {[['base','Base Image'],['color','Color Tool'],['gradient','Gradient']].map(([k,l]) => (
            <button key={k} className={`tab-btn ${tab===k?'active':''}`} style={{ '--tab-color': 'var(--cc)' }} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'base' && (
          <div>
            <div className="field"><label>Preset Images</label></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
              {presetLabels.map(({ key, label }) => {
                const src = presetSrcs[key]; const sel = ch.portrait_base === key
                return (
                  <div key={key} style={{ border: `2px solid ${sel?'var(--cc)':'var(--brd)'}`, borderRadius: 'var(--r)', padding: 4, background: sel?'rgba(201,102,255,.1)':'var(--card)', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => { if (src) { db.upsertEntry('characters',{...ch,portrait_base:key,portrait_custom:null,portrait_canvas:null}); loadBase(src) } }}>
                    {src
                      ? <img src={src} style={{ width:'100%', height:60, objectFit:'contain', filter:'invert(1) brightness(.7)' }} alt={label} />
                      : <div style={{ height:60, display:'flex', alignItems:'center', justifyContent:'center', fontSize: '0.69em', color:'var(--mut)', flexDirection:'column', gap:2 }}>
                          <span>No image</span>
                          <label style={{ fontSize: '0.62em', color:'var(--cc)', cursor:'pointer' }}>Upload<input type="file" accept="image/*" style={{display:'none'}} onChange={e => uploadPreset(key, e)} /></label>
                        </div>
                    }
                    <div style={{ fontSize: '0.62em', color: sel?'var(--cc)':'var(--dim)', marginTop: 2 }}>{label}</div>
                  </div>
                )
              })}
            </div>
            <div className="field"><label>Upload Custom Image</label>
              <label style={{ display:'inline-block', padding:'6px 12px', background:'var(--card)', border:'1px solid var(--brd)', borderRadius:'var(--r)', cursor:'pointer', fontSize: '0.85em' }}>
                📎 Choose Image
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => {
                  const f=e.target.files[0]; if(!f) return
                  const r=new FileReader(); r.onload=ev=>{db.upsertEntry('characters',{...ch,portrait_custom:ev.target.result,portrait_base:null,portrait_canvas:null}); loadBase(ev.target.result)}; r.readAsDataURL(f)
                }} />
              </label>
            </div>
          </div>
        )}

        {tab === 'color' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
              <button className="btn btn-sm btn-outline" onClick={undo}>↩ Undo</button>
              <button className="btn btn-sm btn-outline" onClick={reset}>↺ Reset</button>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize: '0.77em', color:'var(--dim)' }}>Tol:</span>
                <input type="range" min={4} max={80} value={tolerance} style={{ width:70 }} onChange={e => setTolerance(parseInt(e.target.value))} />
                <span style={{ fontSize: '0.77em', color:'var(--cca)' }}>{tolerance}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize: '0.77em', color:'var(--dim)' }}>Zoom:</span>
                <input type="range" min={1} max={4} step={0.25} value={zoom} style={{ width:60 }} onChange={e => setZoom(parseFloat(e.target.value))} />
                <span style={{ fontSize: '0.77em', color:'var(--cca)' }}>{zoom}×</span>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button className={`fp ${fillMode==='flat'?'active':''}`} style={{ color:'var(--cc)' }} onClick={() => setFillMode('flat')}>Flat</button>
                <button className={`fp ${fillMode==='gradient'?'active':''}`} style={{ color:'var(--cca)' }} onClick={() => { setFillMode('gradient'); setTab('gradient') }}>Gradient</button>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <input type="color" value={flatColor} onChange={e => setFlatColor(e.target.value)} style={{ width:36, height:30, padding:0, border:'1px solid var(--brd)', borderRadius:4, cursor:'pointer' }} />
              <span style={{ fontSize: '0.85em', color:'var(--dim)' }}>Current color</span>
              <div style={{ width:20, height:20, borderRadius:'50%', background:flatColor, border:'2px solid rgba(255,255,255,.2)' }} />
            </div>
            {recentColors.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize: '0.69em', color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.03em' }}>Recent</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                  {recentColors.map((c,i) => (
                    <div key={i} style={{ width:18, height:18, borderRadius:3, background:c, border:`2px solid ${c===flatColor?'white':'rgba(255,255,255,.15)'}`, cursor:'pointer' }} onClick={() => setFlatColor(c)} title={c} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize: '0.69em', color:'var(--dim)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.03em' }}>Palette</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:2 }}>
                {PALETTE.map((c,i) => (
                  <div key={i} style={{ width:'100%', paddingBottom:'100%', position:'relative', cursor:'pointer' }} onClick={() => setFlatColor(c)}>
                    <div style={{ position:'absolute', inset:0, background:c, borderRadius:2, border:`2px solid ${c===flatColor?'white':'transparent'}` }} title={c} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'center', overflowX:'auto', border:'1px solid var(--brd)', borderRadius:'var(--r)', background:'var(--sf)' }}>
              <canvas ref={canvasRef} style={{ display:'block', margin:'0 auto', maxWidth:'100%', cursor:'crosshair', transform:`scale(${zoom})`, transformOrigin:'top left', touchAction:'none' }} onClick={handleCanvasClick} />
            </div>
          </div>
        )}

        {tab === 'gradient' && (
          <div>
            <div style={{ fontSize: '0.77em', color:'var(--dim)', marginBottom:8 }}>Set up gradient, then switch to Color Tool and click a region.</div>
            <GradientBar stops={gradStops} setStops={setGradStops} selectedStop={selectedStop} setSelectedStop={setSelectedStop} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize: '0.77em', color:'var(--dim)' }}>Stop color:</span>
                <input type="color" value={gradStops[selectedStop]?.color||'#c966ff'} onChange={e => setGradStops(prev => prev.map((s,i) => i===selectedStop?{...s,color:e.target.value}:s))} style={{ width:32, height:24, padding:0, border:'1px solid var(--brd)', borderRadius:4, cursor:'pointer' }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize: '0.77em', color:'var(--dim)' }}>Angle:</span>
                <input type="number" value={gradAngle} min={0} max={360} style={{ width:50 }} onChange={e => setGradAngle(parseInt(e.target.value)||0)} />°
              </div>
              <select style={{ padding:'3px 5px', borderRadius:4, border:'1px solid var(--brd)', background:'var(--card)', color:'var(--tx)', fontSize: '0.77em' }} value={gradType} onChange={e => setGradType(e.target.value)}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize: '0.69em', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.03em' }}>Saved Gradients</div>
                <button className="btn btn-sm btn-outline" style={{ color:'var(--cca)', borderColor:'var(--cca)' }} onClick={saveGradient}>💾 Save Current</button>
              </div>
              {!savedGrads.length && <div style={{ fontSize: '0.77em', color:'var(--mut)' }}>No saved gradients yet.</div>}
              {savedGrads.map((g,i) => {
                const preview = `linear-gradient(90deg, ${[...g.stops].sort((a,b)=>a.pos-b.pos).map(s=>`${s.color} ${s.pos*100}%`).join(', ')})`
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <div style={{ flex:1, height:20, borderRadius:4, background:preview, border:'1px solid var(--brd)', cursor:'pointer' }} onClick={() => { setGradStops(g.stops); setGradAngle(g.angle); setGradType(g.type) }} />
                    <span style={{ fontSize: '0.77em', color:'var(--dim)', minWidth:60 }}>{g.name}</span>
                    <button style={{ background:'none', border:'none', color:'#ff3355', cursor:'pointer', fontSize: '0.85em' }} onClick={() => { const u=savedGrads.filter((_,idx)=>idx!==i); setSavedGrads(u); db.saveSetting?.('char_gradients',JSON.stringify(u)) }}>✕</button>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:8, textAlign:'center', overflowX:'auto', border:'1px solid var(--brd)', borderRadius:'var(--r)', background:'var(--sf)' }}>
              <canvas ref={canvasRef} style={{ display:'block', margin:'0 auto', maxWidth:'100%', cursor:'crosshair', transform:`scale(${zoom})`, transformOrigin:'top left' }} onClick={handleCanvasClick} />
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14, paddingTop:12, borderTop:'1px solid var(--brd)' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background:'var(--cc)' }} onClick={savePortrait}>Save Portrait</button>
        </div>
      </div>
    </div>
  )
}

function GradientBar({ stops, setStops, selectedStop, setSelectedStop }) {
  const canvasRef = useRef(); const dragging = useRef(null)
  function draw() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height
    const sorted = [...stops].sort((a,b) => a.pos - b.pos)
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    sorted.forEach(s => grad.addColorStop(Math.max(0,Math.min(1,s.pos)), s.color))
    for (let x=0; x<w; x+=8) for (let y=0; y<h; y+=8) {
      ctx.fillStyle = (Math.floor(x/8)+Math.floor(y/8))%2 ? '#ccc' : '#fff'; ctx.fillRect(x,y,8,8)
    }
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h)
    stops.forEach((s,i) => {
      const x = Math.round(s.pos * w)
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x-6,h); ctx.lineTo(x+6,h); ctx.closePath()
      ctx.fillStyle = s.color; ctx.fill()
      ctx.strokeStyle = i===selectedStop?'#fff':'rgba(0,0,0,.6)'; ctx.lineWidth = i===selectedStop?2:1; ctx.stroke()
    })
  }
  useEffect(() => { draw() })
  function getX(e) { const rect = canvasRef.current.getBoundingClientRect(); return (e.clientX - rect.left) * (canvasRef.current.width / rect.width) }
  function onMouseDown(e) {
    const x = getX(e), w = canvasRef.current.width, pos = x/w
    let nearest = -1, minD = 15
    stops.forEach((s,i) => { const d = Math.abs(s.pos*w - x); if (d < minD) { minD=d; nearest=i } })
    if (nearest >= 0) { dragging.current = nearest; setSelectedStop(nearest) }
    else if (e.button === 0) {
      const newStops = [...stops, { pos, color: '#ffffff' }]
      setStops(newStops); dragging.current = newStops.length-1; setSelectedStop(newStops.length-1)
    }
    e.preventDefault()
  }
  function onMouseMove(e) {
    if (dragging.current === null) return
    const pos = Math.max(0, Math.min(1, getX(e) / canvasRef.current.width))
    setStops(prev => prev.map((s,i) => i===dragging.current?{...s,pos}:s))
  }
  function onMouseUp() { dragging.current = null }
  function onContextMenu(e) {
    e.preventDefault(); if (stops.length <= 2) return
    const x = getX(e), w = canvasRef.current.width
    let nearest=-1, minD=15
    stops.forEach((s,i) => { const d=Math.abs(s.pos*w-x); if (d<minD) { minD=d; nearest=i } })
    if (nearest >= 0) { setStops(prev => prev.filter((_,i)=>i!==nearest)); setSelectedStop(0) }
  }
  return (
    <div>
      <div style={{ fontSize: '0.69em', color:'var(--dim)', marginBottom:4 }}>Click bar to add stop · Drag to move · Right-click to remove</div>
      <canvas ref={canvasRef} width={300} height={28} style={{ width:'100%', maxWidth:300, borderRadius:4, cursor:'crosshair', display:'block', border:'1px solid var(--brd)' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onContextMenu={onContextMenu} />
    </div>
  )
}
