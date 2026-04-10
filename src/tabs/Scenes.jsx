import { useState, useMemo } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, BKS, uid, RAINBOW } from '../constants'

const SCENE_FIELDS = [
  { k: 'name',              l: 'Scene',             t: 'text', r: true },
  { k: 'book',              l: 'Book',              t: 'sel', o: ['', ...BKS] },
  { k: 'chapter',           l: 'Chapter',           t: 'text' },
  { k: 'scene_date_hc',     l: 'Date (HC)',         t: 'text' },
  { k: 'season',            l: 'Season',            t: 'sel', o: ['','Summer','Harvest','Winter','Spring'] },
  { k: 'time_of_day',       l: 'Time',              t: 'sel', o: ['','Dawn','Morning','Midday','Afternoon','Evening','Night','Midnight'] },
  { k: 'location_id',       l: 'Location',          t: 'locsel' },
  { k: 'characters_present',l: 'Characters',        t: 'charpick' },
  { k: 'items_present',     l: 'Items',             t: 'itempick' },
  { k: 'animals_bonds',     l: 'Animals/Bonds',     t: 'text' },
  { k: 'clothing_refs',     l: 'Clothing/Appearance',t:'text' },
  { k: 'summary',           l: 'Summary',           t: 'ta' },
  { k: 'tension',           l: 'Tension',           t: 'text' },
  { k: 'emotional_arc',     l: 'Emotional Arc',     t: 'text' },
  { k: 'sort_order',        l: 'Sort #',            t: 'text' },
]

// Continuous spectrum: hue cycles across all scenes regardless of chapter/book
// Lightness variation: lighter = earlier book (book 1 lightest, later books darker/more saturated)
const SCENE_CARDS_PER_ROW = { XS: 8, S: 6, M: 4, L: 3, XL: 2 }
const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL']
const SC_COLOR = '#38b000'

function sceneColor(globalIdx, totalScenes, bookIdx) {
  // Hue cycles through all 18 rainbow stops across all scenes
  const hueIdx = globalIdx % 18
  const hue = RAINBOW[hueIdx]
  return hue
}

export default function Scenes({ db, navSearch }) {
  const scenes = db.db.scenes || []
  const [bookFilter, setBookFilter] = useState('all')
  const [search, setSearch] = useState(navSearch || '')
  const [cardsPerRow, setCardsPerRow] = useState(() => {
    try { return localStorage.getItem('colsize_scenes') || 'M' } catch { return 'M' }
  })
  const [popup, setPopup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  // Sync navSearch
  useState(() => { setSearch(navSearch || '') })

  function changeCardsPerRow(sz) {
    setCardsPerRow(sz)
    try { localStorage.setItem('colsize_scenes', sz) } catch {}
  }

  // Sort all scenes globally by book order then sort_order
  const bookOrder = ['Book 1', 'Book 2', 'Book 3', ...BKS.filter(b => !['Book 1','Book 2','Book 3'].includes(b))]

  const sortedScenes = useMemo(() => [...scenes].sort((a, b) => {
    const bi = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseFloat(a.sort_order) || 0) - (parseFloat(b.sort_order) || 0)
  }), [scenes])

  // Assign global index for spectrum colors (before filtering)
  const scenesWithIdx = useMemo(() =>
    sortedScenes.map((s, i) => ({ ...s, _globalIdx: i })),
    [sortedScenes]
  )

  const filtered = useMemo(() => scenesWithIdx.filter(s => {
    const mBook = bookFilter === 'all' || s.book === bookFilter
    const mSearch = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
    return mBook && mSearch
  }), [scenesWithIdx, bookFilter, search])

  // Group filtered scenes into rows for the wrapped timeline
  const cpr = SCENE_CARDS_PER_ROW[cardsPerRow] || 4
  const rows = useMemo(() => {
    const r = []
    for (let i = 0; i < filtered.length; i += cpr) {
      r.push(filtered.slice(i, i + cpr))
    }
    return r
  }, [filtered, cpr])

  const usedBooks = [...new Set(scenes.map(s => s.book).filter(Boolean))]
    .sort((a, b) => bookOrder.indexOf(a) - bookOrder.indexOf(b))

  function handleSave(entry) {
    db.upsertEntry('scenes', entry)
    setModalOpen(false); setEditing(null)
  }

  const btnStyle = (active) => ({
    fontSize: '0.69em', padding: '2px 7px', borderRadius: 8,
    background: active ? SC_COLOR : 'none',
    color: active ? '#000' : 'var(--dim)',
    border: `1px solid ${active ? SC_COLOR : 'var(--brd)'}`, cursor: 'pointer'
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3, marginRight: 'auto' }}>
          {SIZE_LABELS.map(l => (
            <button key={l} onClick={() => changeCardsPerRow(l)} style={btnStyle(cardsPerRow === l)}>{l}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search scenes…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="btn btn-primary btn-sm" style={{ background: SC_COLOR, color: '#000' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Book filter pills */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          <button className={`fp ${bookFilter === 'all' ? 'active' : ''}`}
            style={bookFilter === 'all' ? { color: SC_COLOR, borderColor: SC_COLOR } : {}}
            onClick={() => setBookFilter('all')}>All Books</button>
          {usedBooks.map(b => (
            <button key={b} className={`fp ${bookFilter === b ? 'active' : ''}`}
              style={bookFilter === b ? { color: SC_COLOR, borderColor: SC_COLOR } : {}}
              onClick={() => setBookFilter(b)}>{b}</button>
          ))}
        </div>
        <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>
          {filtered.length} scene{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🎬</div>
          <p>No scenes yet.</p>
          <button className="btn btn-primary" style={{ background: SC_COLOR, color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Scene</button>
        </div>
      )}

      {/* Wrapped timeline */}
      {rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          {/* Row divider (not first row) */}
          {rowIdx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', gap: 6 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--brd)' }} />
              <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>↩</span>
              <div style={{ flex: 1, height: 1, background: 'var(--brd)' }} />
            </div>
          )}

          {/* Scene cards row */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'stretch', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {row.map((scene, cardIdx) => {
              const color = RAINBOW[scene._globalIdx % 18]
              const sceneNum = scene._globalIdx + 1
              // Chapter label: show at first scene of each chapter
              const prevScene = cardIdx > 0 ? row[cardIdx - 1] : (rowIdx > 0 ? rows[rowIdx-1][rows[rowIdx-1].length-1] : null)
              const chapterChanged = !prevScene || prevScene.chapter !== scene.chapter || prevScene.book !== scene.book

              return (
                <div key={scene.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, flexShrink: 0 }}>
                  {/* Chevron between cards */}
                  {cardIdx > 0 && (
                    <div style={{ alignSelf: 'center', color: 'var(--mut)', fontSize: '0.77em', margin: '0 2px' }}>›</div>
                  )}

                  {/* Card */}
                  <div
                    onClick={() => setPopup(scene)}
                    style={{
                      width: cardsPerRow === 'XS' ? 90 : cardsPerRow === 'S' ? 110 : cardsPerRow === 'M' ? 140 : cardsPerRow === 'L' ? 180 : 220,
                      minHeight: 64,
                      background: 'var(--card)',
                      border: `2px solid ${color}`,
                      borderRadius: 'var(--r)',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      transition: 'transform .12s, box-shadow .12s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}44` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    {/* Scene number badge */}
                    <div style={{
                      position: 'absolute', top: -8, right: 4,
                      background: color, color: '#000',
                      fontSize: '0.62em', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 8, lineHeight: 1.4,
                    }}>{sceneNum}</div>

                    {/* Chapter header if changed */}
                    {chapterChanged && scene.chapter && (
                      <div style={{ fontSize: '0.62em', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>
                        {scene.book ? scene.book.replace('Book ', 'B') : ''} Ch.{scene.chapter}
                      </div>
                    )}

                    <div style={{ fontSize: '0.77em', fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {scene.name || '(untitled)'}
                    </div>

                    {cardsPerRow !== 'XS' && scene.scene_date_hc && (
                      <div style={{ fontSize: '0.62em', color: 'var(--mut)', marginTop: 3 }}>{scene.scene_date_hc}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Scene popup */}
      {popup && (
        <div className="modal-overlay open" onClick={() => setPopup(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <button className="modal-close" onClick={() => setPopup(null)}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                background: RAINBOW[popup._globalIdx % 18], color: '#000',
                fontSize: '0.77em', fontWeight: 700, padding: '2px 8px', borderRadius: 10
              }}>Scene {popup._globalIdx + 1}</div>
              {popup.book && <span className="badge badge-book">{popup.book}</span>}
              {popup.chapter && <span style={{ fontSize: '0.77em', color: 'var(--dim)' }}>Ch.{popup.chapter}</span>}
            </div>
            <div className="modal-title" style={{ color: RAINBOW[popup._globalIdx % 18] }}>
              {popup.name || '(untitled)'}
            </div>
            <div className="entry-detail" style={{ marginTop: 8 }}>
              {popup.scene_date_hc && <div><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Date: </strong>{popup.scene_date_hc}</div>}
              {popup.season && <div><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Season: </strong>{popup.season}</div>}
              {popup.time_of_day && <div><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Time: </strong>{popup.time_of_day}</div>}
              {popup.summary && <div style={{ marginTop: 6, lineHeight: 1.5 }}>{popup.summary}</div>}
              {popup.tension && <div style={{ marginTop: 4 }}><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Tension: </strong>{popup.tension}</div>}
              {popup.emotional_arc && <div style={{ marginTop: 4 }}><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Arc: </strong>{popup.emotional_arc}</div>}
              {popup.characters_present && <div style={{ marginTop: 4 }}><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Characters: </strong>{popup.characters_present}</div>}
              {popup.clothing_refs && <div style={{ marginTop: 4 }}><strong style={{ fontSize: '0.69em', textTransform: 'uppercase', color: RAINBOW[popup._globalIdx % 18] }}>Clothing: </strong>{popup.clothing_refs}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" style={{ color: SC_COLOR, borderColor: SC_COLOR }}
                onClick={() => { setEditing(popup); setPopup(null); setModalOpen(true) }}>✎ Edit</button>
              <button className="btn btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
                onClick={() => { setConfirmId(popup.id); setPopup(null) }}>✕ Delete</button>
              <button className="btn btn-outline" onClick={() => setPopup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing?.id ? 'Edit Scene' : 'Add Scene'} color={SC_COLOR}>
        <EntryForm fields={SCENE_FIELDS} entry={editing || {}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} color={SC_COLOR} label="Scenes" db={db} />
      </Modal>

      {/* Confirm delete */}
      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{scenes.find(s => s.id === confirmId)?.name || 'this scene'}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('scenes', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
