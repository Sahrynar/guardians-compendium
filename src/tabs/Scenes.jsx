import { useState, useEffect, useRef, useCallback } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, BKS, uid } from '../constants'
import Lightbox from '../components/common/Lightbox'

const SCENE_FIELDS = [
  { k: 'name',              l: 'Scene',              t: 'text', r: true },
  { k: 'book',              l: 'Book',               t: 'sel', o: ['', ...BKS] },
  { k: 'chapter',           l: 'Chapter',            t: 'text' },
  { k: 'scene_date_hc',     l: 'Date (HC)',           t: 'text' },
  { k: 'season',            l: 'Season',             t: 'sel', o: ['','Summer','Harvest','Winter','Spring'] },
  { k: 'time_of_day',       l: 'Time',               t: 'sel', o: ['','Dawn','Morning','Midday','Afternoon','Evening','Night','Midnight'] },
  { k: 'location_id',       l: 'Location',           t: 'locsel' },
  { k: 'characters_present',l: 'Characters',         t: 'charpick' },
  { k: 'items_present',     l: 'Items',              t: 'itempick' },
  { k: 'animals_bonds',     l: 'Animals/Bonds',      t: 'text' },
  { k: 'clothing_refs',     l: 'Clothing/Appearance',t: 'text' },
  { k: 'summary',           l: 'Summary',            t: 'ta' },
  { k: 'tension',           l: 'Tension',            t: 'text' },
  { k: 'emotional_arc',     l: 'Emotional Arc',      t: 'text' },
  { k: 'sort_order',        l: 'Sort #',             t: 'text' },
]

// ── Book ordering ─────────────────────────────────────────────────
const BOOK_ORDER = ['Pre-Series','Book 1','Between B1–B2','Book 2','Between B2–B3','Book 3','Between B3–B4','Book 4','Book 5','Book 6']

// ── Spectrum color system ─────────────────────────────────────────
// Hue families cycling through spectrum by chapter number
// Lightness varies by book (lighter = earlier), resets every 6 books
const HUE_FAMILIES = [
  { h: 340, name: 'pink'   },
  { h: 0,   name: 'red'    },
  { h: 20,  name: 'orange' },
  { h: 45,  name: 'yellow' },
  { h: 120, name: 'green'  },
  { h: 170, name: 'teal'   },
  { h: 210, name: 'blue'   },
  { h: 250, name: 'indigo' },
  { h: 280, name: 'violet' },
]

// Maps a book to a lightness offset (0=lightest, 5=darkest, cycles every 6)
function bookLightnessOffset(bookName) {
  const idx = BOOK_ORDER.indexOf(bookName)
  if (idx < 0) return 0
  return idx % 6
}

// Gets the color for a scene given its global sequence index and book
function sceneColor(seqIdx, bookName, totalScenes) {
  // Hue: cycles through HUE_FAMILIES based on scene position
  const hueIdx = seqIdx % HUE_FAMILIES.length
  const { h } = HUE_FAMILIES[hueIdx]

  // Saturation stays vivid
  const s = 70

  // Lightness: base varies by book (book 1 lightest, book 6 darkest in cycle)
  // Range: 55% (lightest/book1) down to 35% (darkest/book6)
  const offset = bookLightnessOffset(bookName)
  const l = 55 - offset * 4

  // Within a chapter, if there are many scenes we step slightly
  // But seqIdx already handles the continuous flow

  return {
    border: `hsl(${h},${s}%,${l}%)`,
    bg: `hsl(${h},${s}%,${l}%,0.12)`,
    text: `hsl(${h},${s}%,${Math.max(l - 10, 25)}%)`,
    solid: `hsl(${h},${s}%,${l}%)`,
  }
}

// Cards per row by size
const CARDS_PER_ROW = { XS: 10, S: 7, M: 5, L: 3, XL: 2 }

export default function Scenes({ db, goToWithSearch, crossLink, clearCrossLink }) {
  const scenes = db.db.scenes || []
  const [bookFilter, setBookFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [cardSize, setCardSize] = useState(() => db.getSetting?.('sc_card_size') || 'M')
  function saveCardSize(s) { setCardSize(s); db.saveSetting?.('sc_card_size', s) }
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (crossLink?.search) {
      setSearch(crossLink.search)
      clearCrossLink?.()
    }
  }, [crossLink])

  // ── Sort scenes: by book order, then chapter, then sort_order ──
  const allBooks = [...new Set(scenes.map(s => s.book).filter(Boolean))]
    .sort((a, b) => {
      const ai = BOOK_ORDER.indexOf(a), bi = BOOK_ORDER.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b)
    })

  const filtered = scenes
    .filter(s => {
      const mb = bookFilter === 'all' || s.book === bookFilter
      const ms = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
      return mb && ms
    })
    .sort((a, b) => {
      const ai = BOOK_ORDER.indexOf(a.book || ''), bi = BOOK_ORDER.indexOf(b.book || '')
      if (ai !== bi) {
        if (ai < 0 && bi >= 0) return 1
        if (ai >= 0 && bi < 0) return -1
        if (ai >= 0 && bi >= 0) return ai - bi
      }
      const ca = parseInt(a.chapter) || 0, cb = parseInt(b.chapter) || 0
      if (ca !== cb) return ca - cb
      return (parseFloat(a.sort_order) || 0) - (parseFloat(b.sort_order) || 0)
    })

  // Assign global sequential index for color (across all books)
  const globalIdx = {}
  filtered.forEach((s, i) => { globalIdx[s.id] = i })

  function locName(id) {
    const l = (db.db.locations || []).find(l => l.id === id)
    return l ? l.name : ''
  }

  function handleSave(entry) {
    if (entry.scene_date_hc && !entry.id) {
      db.upsertEntry('timeline', {
        id: uid(), name: `Scene: ${entry.name}`,
        date_hc: entry.scene_date_hc, sort_order: '',
        era: entry.book || '', detail: entry.summary || '',
        status: 'provisional', books: entry.book ? [entry.book] : [],
        relationships: [], created: new Date().toISOString()
      })
    }
    db.upsertEntry('scenes', entry)
    setModalOpen(false); setEditing(null)
  }

  function charTags(str) {
    if (!str) return []
    return str.split(',').map(s => s.trim().replace(/^ch_/, '')).filter(Boolean)
  }

  // ── Timeline row layout ────────────────────────────────────────
  const perRow = CARDS_PER_ROW[cardSize] || 5

  // Group filtered scenes into rows of perRow
  function chunkRows(arr, size) {
    const rows = []
    for (let i = 0; i < arr.length; i += size) {
      rows.push(arr.slice(i, i + size))
    }
    return rows
  }

  const rows = chunkRows(filtered, perRow)

  // Drag reorder
  const dragRef = useRef(null)

  // ── Compact timeline card ──────────────────────────────────────
  function TimelineCard({ s, idx, isLast }) {
    const col = sceneColor(globalIdx[s.id], s.book, filtered.length)
    const sceneNum = globalIdx[s.id] + 1
    const isLastInRow = isLast

    return (
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div
          onClick={() => setViewPopup(s)}
          draggable
          onDragStart={() => { dragRef.current = filtered.indexOf(s) }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            const toIdx = filtered.indexOf(s)
            const fromIdx = dragRef.current
            if (fromIdx === null || fromIdx === toIdx) return
            const reordered = [...filtered]
            const [moved] = reordered.splice(fromIdx, 1)
            reordered.splice(toIdx, 0, moved)
            reordered.forEach((sc, i) => db.upsertEntry('scenes', { ...sc, sort_order: String(i * 10) }))
            dragRef.current = null
          }}
          style={{
            border: `2px solid ${col.border}`,
            background: col.bg,
            borderRadius: 8,
            padding: '6px 8px',
            cursor: 'pointer',
            minWidth: 80,
            maxWidth: 140,
            flexShrink: 0,
            position: 'relative',
            transition: 'transform .1s, box-shadow .1s',
            userSelect: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 4px 12px ${col.border}44`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = ''
          }}
        >
          {/* Scene number badge */}
          <div style={{
            position: 'absolute', top: -8, left: 6,
            background: col.border, color: '#fff',
            fontSize: '0.54em', fontWeight: 700, borderRadius: 10,
            padding: '1px 5px', lineHeight: 1.4,
          }}>#{sceneNum}</div>

          {/* Chapter label */}
          {s.chapter && (
            <div style={{ fontSize: '0.54em', color: col.text, fontWeight: 700, marginBottom: 2, opacity: 0.8 }}>
              Ch.{s.chapter}
            </div>
          )}

          {/* Scene title */}
          <div style={{
            fontSize: '0.72em', fontWeight: 600, color: col.text,
            lineHeight: 1.3, wordBreak: 'break-word',
          }}>
            {s.name || '(untitled)'}
          </div>

          {/* Edit/delete buttons on hover */}
          <div style={{ display: 'flex', gap: 3, marginTop: 4 }} onClick={e => e.stopPropagation()}>
            <button style={{ fontSize: '0.54em', padding: '1px 4px', borderRadius: 4, border: `1px solid ${col.border}44`, background: 'none', color: col.text, cursor: 'pointer' }}
              onClick={() => { setEditing(s); setModalOpen(true) }}>✎</button>
            <button style={{ fontSize: '0.54em', padding: '1px 4px', borderRadius: 4, border: '1px solid #ff335544', background: 'none', color: '#ff3355', cursor: 'pointer' }}
              onClick={() => setConfirmId(s.id)}>✕</button>
          </div>
        </div>

        {/* Arrow connector — only if not last in row */}
        {!isLastInRow && (
          <div style={{ color: 'var(--mut)', fontSize: '1em', margin: '0 3px', flexShrink: 0, opacity: 0.5 }}>›</div>
        )}
      </div>
    )
  }

  // ── Full scene popup (modal overlay) ──────────────────────────
  function ScenePopup({ s, onClose }) {
    const loc = locName(s.location_id)
    const chars = charTags(s.characters_present)
    const items = s.items_present ? s.items_present.split(',').map(x => x.trim()).filter(Boolean) : []
    const animals = s.animals_bonds ? s.animals_bonds.split(',').map(x => x.trim()).filter(Boolean) : []
    const col = sceneColor(globalIdx[s.id], s.book, filtered.length)

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onClose}>
        <div style={{ background: 'var(--sf)', border: `1px solid ${col.border}44`,
          borderRadius: 12, padding: 20, maxWidth: 580, width: '100%',
          maxHeight: '88vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.69em', color: col.border, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                {[s.book, s.chapter && `Ch. ${s.chapter}`].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: 'var(--tx)', lineHeight: 1.3 }}>{s.name}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '1.38em', color: 'var(--mut)', marginLeft: 10 }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14,
            padding: 10, background: 'var(--card)', borderRadius: 8 }}>
            {loc && <div style={{ fontSize: '0.77em' }}>📍 <strong>{loc}</strong></div>}
            {s.scene_date_hc && <div style={{ fontSize: '0.77em' }}>📅 {s.scene_date_hc}</div>}
            {s.season && <div style={{ fontSize: '0.77em' }}>🌿 {s.season}</div>}
            {s.time_of_day && <div style={{ fontSize: '0.77em' }}>🕐 {s.time_of_day}</div>}
          </div>

          {chars.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--cc)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>👤 Characters Present</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {chars.map(c => (
                  <button key={c} onClick={() => { onClose(); goToWithSearch?.('characters', c) }}
                    style={{ fontSize: '0.85em', padding: '3px 10px', background: 'rgba(201,102,255,.12)', color: 'var(--cc)', border: '1px solid rgba(201,102,255,.25)', borderRadius: 12, cursor: 'pointer' }}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--ci)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>⚔ Items Present</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {items.map(it => <span key={it} style={{ fontSize: '0.85em', padding: '3px 10px', background: 'rgba(255,112,64,.12)', color: 'var(--ci)', border: '1px solid rgba(255,112,64,.25)', borderRadius: 12 }}>{it}</span>)}
              </div>
            </div>
          )}

          {animals.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--cl)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>🐴 Animals / Bonds</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {animals.map(a => <span key={a} style={{ fontSize: '0.85em', padding: '3px 10px', background: 'rgba(122,204,122,.12)', color: 'var(--cl)', border: '1px solid rgba(122,204,122,.25)', borderRadius: 12 }}>{a}</span>)}
              </div>
            </div>
          )}

          {/* Shared items auto-detect */}
          {(() => {
            const presentChars = charTags(s.characters_present)
            const allItems = db.db.items || []
            const allChars = db.db.characters || []
            const sharedItems = allItems.filter(it => {
              if (!it.shared_with) return false
              const hc = allChars.find(c => c.id === it.holder)
              const sc = allChars.find(c => c.id === it.shared_with)
              const hn = hc?.name || it.holder || ''
              const sn = sc?.name || it.shared_with || ''
              return presentChars.some(c => c.toLowerCase() === hn.toLowerCase()) ||
                     presentChars.some(c => c.toLowerCase() === sn.toLowerCase())
            })
            if (!sharedItems.length) return null
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--sp)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>↔ Shared Items</div>
                {sharedItems.map(it => {
                  const hc = allChars.find(c => c.id === it.holder)
                  return (
                    <div key={it.id} style={{ fontSize: '0.85em', padding: '4px 8px', background: 'rgba(255,170,51,.08)', borderRadius: 6, border: '1px solid rgba(255,170,51,.2)', marginBottom: 4 }}>
                      <strong>{it.name}</strong><span style={{ color: 'var(--mut)', marginLeft: 6 }}>with {hc?.name || it.holder || '?'}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {s.clothing_refs && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--cwr)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>👗 Clothing / Appearance</div>
              <div style={{ fontSize: '0.85em', color: 'var(--tx)', lineHeight: 1.6 }}>{s.clothing_refs}</div>
            </div>
          )}

          {s.summary && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.69em', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Summary</div>
              <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.summary}</div>
            </div>
          )}

          {(s.tension || s.emotional_arc) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, padding: 10, background: 'var(--card)', borderRadius: 8 }}>
              {s.tension && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.69em', color: 'var(--ccn)', fontWeight: 700, marginBottom: 2 }}>⚡ Tension</div>
                  <div style={{ fontSize: '0.85em', color: 'var(--tx)' }}>{s.tension}</div>
                </div>
              )}
              {s.emotional_arc && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.69em', color: 'var(--cca)', fontWeight: 700, marginBottom: 2 }}>💫 Emotional Arc</div>
                  <div style={{ fontSize: '0.85em', color: 'var(--tx)' }}>{s.emotional_arc}</div>
                </div>
              )}
            </div>
          )}

          {s.notes && <div style={{ fontSize: '0.85em', color: 'var(--dim)', lineHeight: 1.6, borderTop: '1px solid var(--brd)', paddingTop: 10, marginTop: 10 }}>{s.notes}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--csc)', borderColor: 'var(--csc)44' }}
              onClick={() => { onClose(); setEditing(s); setModalOpen(true) }}>✎ Edit</button>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="tbar">
        {/* Card size picker */}
        <div style={{ display: 'flex', gap: 3 }}>
          {Object.keys(CARDS_PER_ROW).map(s => (
            <button key={s} onClick={() => saveCardSize(s)}
              style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8,
                background: cardSize === s ? 'var(--csc)' : 'none',
                color: cardSize === s ? '#000' : 'var(--dim)',
                border: `1px solid ${cardSize === s ? 'var(--csc)' : 'var(--brd)'}`,
                cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search scenes…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm"
          style={{ background: 'var(--csc)', color: '#000' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Book filter */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          <button className={`fp ${bookFilter === 'all' ? 'active' : ''}`}
            style={{ color: 'var(--csc)' }} onClick={() => setBookFilter('all')}>All Books</button>
          {allBooks.map(b => (
            <button key={b} className={`fp ${bookFilter === b ? 'active' : ''}`}
              style={{ color: 'var(--csc)' }}
              onClick={() => setBookFilter(bookFilter === b ? 'all' : b)}>{b}</button>
          ))}
        </div>
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🎬</div>
          <p>No scenes yet{bookFilter !== 'all' ? ` for ${bookFilter}` : ''}</p>
          <button className="btn btn-primary" style={{ background: 'var(--csc)', color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Scene</button>
        </div>
      )}

      {/* ── Wrapped horizontal timeline ── */}
      <div style={{ marginTop: 8 }}>
        {rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1
          const globalRowStart = rowIdx * perRow
          return (
            <div key={rowIdx} style={{ marginBottom: 2 }}>
              {/* Row of cards with arrows */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap',
                overflowX: 'auto', paddingBottom: 4, gap: 0 }}>
                {/* ← return arrow at start of non-first rows */}
                {rowIdx > 0 && (
                  <div style={{ color: 'var(--mut)', fontSize: '0.92em', marginRight: 4, flexShrink: 0, opacity: 0.4 }}>↩</div>
                )}

                {row.map((s, i) => {
                  const isLastInRow = i === row.length - 1
                  // Last card in row but not last card overall = show wrap arrow
                  return (
                    <TimelineCard
                      key={s.id}
                      s={s}
                      idx={globalRowStart + i}
                      isLast={isLastInRow}
                    />
                  )
                })}

                {/* Wrap arrow at end of non-last rows */}
                {!isLastRow && (
                  <div style={{ color: 'var(--mut)', fontSize: '0.92em', marginLeft: 4, flexShrink: 0, opacity: 0.4 }}>↩</div>
                )}
              </div>

              {/* Thin connecting line between rows */}
              {!isLastRow && (
                <div style={{ height: 1, background: 'var(--brd)', margin: '2px 0 4px', opacity: 0.4 }} />
              )}
            </div>
          )
        })}
      </div>

      {viewPopup && <ScenePopup s={viewPopup} onClose={() => setViewPopup(null)} />}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id ? 'Edit' : 'Add'} Scene`} color="var(--csc)">
        <EntryForm fields={SCENE_FIELDS} entry={editing || {}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          color="var(--csc)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{scenes.find(s => s.id === confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm"
              onClick={() => { db.deleteEntry('scenes', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
