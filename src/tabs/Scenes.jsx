import { useState, useMemo } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { uid, RAINBOW, lerpColor, BKS } from '../constants'

const SC_COLOR = '#38b000'
const SCENE_FIELDS = [
  { k: 'name',              l: 'Scene',             t: 'text', r: true },
  { k: 'book',              l: 'Book',              t: 'sel', o: ['','Book 1','Book 2','Book 3'] },
  { k: 'chapter',           l: 'Chapter',           t: 'text' },
  { k: 'scene_date_hc',     l: 'Date (HC)',         t: 'text' },
  { k: 'season',            l: 'Season',            t: 'sel', o: ['','Summer','Harvest','Winter','Spring'] },
  { k: 'time_of_day',       l: 'Time',              t: 'sel', o: ['','Dawn','Morning','Midday','Afternoon','Evening','Night','Midnight'] },
  { k: 'location_id',       l: 'Location',          t: 'locsel' },
  { k: 'characters_present',l: 'Characters',        t: 'charpick' },
  { k: 'summary',           l: 'Summary',           t: 'ta' },
  { k: 'tension',           l: 'Tension',           t: 'text' },
  { k: 'emotional_arc',     l: 'Emotional Arc',     t: 'text' },
  { k: 'sort_order',        l: 'Sort #',            t: 'text' },
]

const CARDS_PER_ROW = { XS: 8, S: 6, M: 4, L: 3, XL: 2 }
const BOOK_ORDER = ['Book 1', 'Book 2', 'Book 3']

// ── Chapter color system ───────────────────────────────────────
// Chapters use every-other RAINBOW stop as their "home" color.
// Scenes within a chapter interpolate from home → just-before-next-home.
// chapterIdx = 0-based index of this chapter in the sorted chapter list.
function chapterHomeColor(chapterIdx) {
  // Chapters use stops 0, 2, 4, 6, 8, 10, 12, 14, 16 then cycle
  const stopIdx = (chapterIdx * 2) % 18
  return RAINBOW[stopIdx]
}

function chapterNextHomeColor(chapterIdx) {
  const nextStopIdx = ((chapterIdx * 2) + 2) % 18
  return RAINBOW[nextStopIdx]
}

// Color for scene at position sceneIdx (0-based) within a chapter of totalScenes scenes
function sceneColor(chapterIdx, sceneIdx, totalScenes) {
  const home = chapterHomeColor(chapterIdx)
  const next = chapterNextHomeColor(chapterIdx)
  if (totalScenes <= 1) return home
  // Interpolate from home toward next, never quite reaching next
  const t = (sceneIdx / totalScenes) * 0.92 // stops at 92% toward next
  return lerpColor(home, next, t)
}

export default function Scenes({ db, navSearch }) {
  const scenes = db.db.scenes || []
  const manuscripts = db.db.manuscript || []
  const [bookFilter, setBookFilter] = useState('all')
  const [search, setSearch] = useState(navSearch || '')
  const [cardsPerRow, setCardsPerRow] = useState(() => {
    try { return localStorage.getItem('colsize_scenes') || 'M' } catch { return 'M' }
  })
  const [popup, setPopup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  function changeCPR(sz) {
    setCardsPerRow(sz)
    try { localStorage.setItem('colsize_scenes', sz) } catch {}
  }

  // Build chapter title lookup from Manuscript: { 'Book 1:1': 'An Inner Light', ... }
  const chapterTitles = useMemo(() => {
    const map = {}
    manuscripts.forEach(ch => {
      if (ch.book && ch.chapter_num) {
        map[`${ch.book}:${ch.chapter_num}`] = ch.title || ''
      }
    })
    return map
  }, [manuscripts])

  const sorted = useMemo(() => [...scenes].sort((a, b) => {
    const bi = BOOK_ORDER.indexOf(a.book) - BOOK_ORDER.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseFloat(a.sort_order) || 0) - (parseFloat(b.sort_order) || 0)
  }), [scenes])

  // Group scenes into chapters, assign chapter index for color system
  const chapterGroups = useMemo(() => {
    const groups = [] // [{ book, chapter, chapterIdx, scenes: [...] }]
    let chIdx = 0
    let prevKey = null
    let prevBook = null

    sorted.forEach(scene => {
      const key = `${scene.book || ''}:${scene.chapter || ''}`
      // Reset chapter color index at the start of each book so Book 1/2/3 all start at Pink
      if (scene.book !== prevBook) { chIdx = 0; prevBook = scene.book }
      if (key !== prevKey) {
        groups.push({ book: scene.book, chapter: scene.chapter, chapterIdx: chIdx, scenes: [] })
        chIdx++
        prevKey = key
      }
      groups[groups.length - 1].scenes.push(scene)
    })
    return groups
  }, [sorted])

  // Flatten filtered scenes with color pre-computed
  const coloredScenes = useMemo(() => {
    const result = []
    chapterGroups.forEach(grp => {
      const total = grp.scenes.length
      grp.scenes.forEach((scene, si) => {
        result.push({
          ...scene,
          _chapterIdx: grp.chapterIdx,
          _sceneIdxInChapter: si,
          _totalInChapter: total,
          _color: sceneColor(grp.chapterIdx, si, total),
          _homeColor: chapterHomeColor(grp.chapterIdx),
        })
      })
    })
    return result
  }, [chapterGroups])

  const filtered = useMemo(() => coloredScenes.filter(s => {
    const mb = bookFilter === 'all' || s.book === bookFilter
    const ms = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
    return mb && ms
  }), [coloredScenes, bookFilter, search])

  const cpr = CARDS_PER_ROW[cardsPerRow] || 4

  // Re-group filtered scenes by chapter for bracket rendering
  const filteredChapterGroups = useMemo(() => {
    const groups = []
    let prevKey = null
    filtered.forEach(scene => {
      const key = `${scene.book || ''}:${scene.chapter || ''}`
      if (key !== prevKey) {
        groups.push({
          book: scene.book,
          chapter: scene.chapter,
          chapterIdx: scene._chapterIdx,
          homeColor: scene._homeColor,
          scenes: [],
        })
        prevKey = key
      }
      groups[groups.length - 1].scenes.push(scene)
    })
    return groups
  }, [filtered])

  const usedBooks = [...new Set(scenes.map(s => s.book).filter(Boolean))]
    .sort((a, b) => BOOK_ORDER.indexOf(a) - BOOK_ORDER.indexOf(b))

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

  // Summary preview by card size
  function summaryPreview(summary, size) {
    if (!summary) return null
    const limits = { XS: 0, S: 40, M: 60, L: 90, XL: 140 }
    const limit = limits[size] || 0
    if (!limit) return null
    return summary.length > limit ? summary.slice(0, limit) + '…' : summary
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="tbar">
        <div style={{ display: 'flex', gap: 3 }}>
          {['XS','S','M','L','XL'].map(l => (
            <button key={l} onClick={() => changeCPR(l)} style={btnStyle(cardsPerRow === l)}>{l}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search scenes…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn btn-primary btn-sm" style={{ background: SC_COLOR, color: '#000', marginLeft: 'auto' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Book filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '4px 0 8px', alignItems: 'center' }}>
        <button onClick={() => setBookFilter('all')} style={btnStyle(bookFilter === 'all')}>All Books</button>
        {usedBooks.map(b => (
          <button key={b} onClick={() => setBookFilter(b)} style={btnStyle(bookFilter === b)}>{b}</button>
        ))}
        <span style={{ fontSize: '0.69em', color: 'var(--mut)', marginLeft: 4 }}>{filtered.length} scenes</span>
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🎬</div><p>No scenes yet.</p>
          <button className="btn btn-primary" style={{ background: SC_COLOR, color: '#000' }}
            onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add Scene</button>
        </div>
      )}

      {/* Chapter groups with bracket design */}
      {filteredChapterGroups.map((grp, gi) => {
        const { homeColor, chapter, book, scenes: grpScenes } = grp
        const chTitle = chapter && book ? chapterTitles[`${book}:${chapter}`] : ''
        const bookLabel = book ? book.replace('Book ', 'B') + ' · ' : ''
        const chLabel = chapter ? `${bookLabel}Ch.${chapter}` : null

        // Split chapter scenes into rows
        const chRows = []
        for (let i = 0; i < grpScenes.length; i += cpr) chRows.push(grpScenes.slice(i, i + cpr))

        return (
          <div key={`ch-${gi}`} style={{ marginBottom: 10 }}>

            {/* Chapter header bar */}
            {chLabel && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 10px',
                background: `${homeColor}18`,
                border: `1.5px solid ${homeColor}`,
                borderBottom: 'none',
                borderRadius: '6px 6px 0 0',
                marginBottom: 0,
              }}>
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.77em', fontWeight: 700,
                  color: homeColor, letterSpacing: '.05em',
                }}>
                  {chLabel}
                  {chTitle && (
                    <span style={{ fontWeight: 400, marginLeft: 8, opacity: 0.85 }}>— {chTitle}</span>
                  )}
                </span>
                <span style={{ fontSize: '0.62em', color: homeColor, opacity: 0.5, marginLeft: 'auto' }}>
                  {grpScenes.length} scene{grpScenes.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Left-border bracket wrapping all rows */}
            <div style={{
              borderLeft: `1.5px solid ${homeColor}`,
              borderRight: `1.5px solid ${homeColor}`,
              borderBottom: `1.5px solid ${homeColor}`,
              borderRadius: chLabel ? '0 0 6px 6px' : '0 0 6px 6px',
              padding: '6px 6px 4px 6px',
              background: `${homeColor}06`,
            }}>
              {chRows.map((row, ri) => {
                const prevRowLast = ri > 0 ? chRows[ri-1][chRows[ri-1].length-1] : null

                return (
                  <div key={ri}>
                    {/* Row wrap indicator (not before first row) */}
                    {ri > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', margin: '3px 0', gap: 6 }}>
                        <div style={{ flex: 1, height: 1, background: homeColor, opacity: 0.2 }} />
                        <span style={{ fontSize: '0.62em', color: homeColor, opacity: 0.5 }}>↩</span>
                        <div style={{ flex: 1, height: 1, background: homeColor, opacity: 0.2 }} />
                      </div>
                    )}

                    {/* Scene cards row */}
                    <div style={{ display: 'flex', width: '100%', gap: 3, alignItems: 'stretch', marginBottom: 2 }}>
                      {row.map((scene, ci) => {
                        const color = scene._color
                        const prevScene = ci > 0 ? row[ci-1] : prevRowLast

                        return (
                          <div key={scene.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, maxWidth: `calc(${(100/cpr).toFixed(1)}% - 3px)` }}>
                            {/* Arrow between scenes */}
                            {ci > 0 && (
                              <div style={{
                                color: 'var(--brd)', fontSize: '0.77em',
                                margin: '0 2px', flexShrink: 0, opacity: 0.5,
                              }}>›</div>
                            )}

                            {/* Card */}
                            <div onClick={() => setPopup(scene)}
                              style={{
                                flex: 1, minWidth: 0,
                                background: 'var(--card)',
                                border: `2px solid ${color}`,
                                borderRadius: 'var(--r)',
                                padding: cardsPerRow === 'XS' ? '4px 5px' : '6px 8px',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'transform .12s, box-shadow .12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}44` }}
                              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                            >
                              {/* Scene number badge */}
                              <div style={{
                                position: 'absolute', top: -7, right: 3,
                                background: color, color: '#000',
                                fontSize: '0.55em', fontWeight: 700, padding: '1px 4px',
                                borderRadius: 6, lineHeight: 1.4,
                              }}>{scene._sceneIdxInChapter + 1}</div>

                              {/* Scene name */}
                              <div style={{
                                fontSize: cardsPerRow === 'XS' ? '0.62em' : cardsPerRow === 'S' ? '0.69em' : '0.77em',
                                fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3,
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {scene.name || '(untitled)'}
                              </div>

                              {/* Summary preview */}
                              {summaryPreview(scene.summary, cardsPerRow) && (
                                <div style={{
                                  fontSize: '0.62em', color: 'var(--mut)',
                                  marginTop: 2, lineHeight: 1.3,
                                  overflow: 'hidden', display: '-webkit-box',
                                  WebkitLineClamp: cardsPerRow === 'XL' ? 3 : 2,
                                  WebkitBoxOrient: 'vertical',
                                  fontStyle: 'italic',
                                }}>
                                  {summaryPreview(scene.summary, cardsPerRow)}
                                </div>
                              )}

                              {/* Date (L and XL) */}
                              {(cardsPerRow === 'L' || cardsPerRow === 'XL') && scene.scene_date_hc && (
                                <div style={{ fontSize: '0.55em', color: color, opacity: 0.7, marginTop: 2 }}>{scene.scene_date_hc}</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {/* Ghost cards — inside scene row div, row in scope */}
                      {Array.from({ length: Math.max(0, cpr - row.length) }).map((_, gi) => (
                        <div key={`ghost-${gi}`} style={{ flex: 1, minWidth: 0, maxWidth: `calc(${(100/cpr).toFixed(1)}% - 3px)`, visibility: 'hidden' }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gap between chapter groups */}
            {gi < filteredChapterGroups.length - 1 && (
              <div style={{ height: 4 }} />
            )}
          </div>
        )
      })}

      {/* Scene popup */}
      {popup && (
        <div className="modal-overlay open" onClick={() => setPopup(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setPopup(null)}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ background: popup._color, color: '#000',
                fontSize: '0.77em', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                Scene {popup._sceneIdxInChapter + 1}
              </div>
              {popup.book && <span style={{ fontSize: '0.77em', color: 'var(--dim)', border: '1px solid var(--brd)', padding: '1px 6px', borderRadius: 4 }}>{popup.book}</span>}
              {popup.chapter && <span style={{ fontSize: '0.77em', color: popup._homeColor }}>
                Ch.{popup.chapter}
                {chapterTitles[`${popup.book}:${popup.chapter}`] && (
                  <span style={{ color: 'var(--dim)', fontWeight: 400 }}> — {chapterTitles[`${popup.book}:${popup.chapter}`]}</span>
                )}
              </span>}
            </div>
            <div className="modal-title" style={{ color: popup._color }}>{popup.name || '(untitled)'}</div>
            <div style={{ marginTop: 8, fontSize: '0.85em', lineHeight: 1.6 }}>
              {popup.scene_date_hc && <div><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Date: </strong>{popup.scene_date_hc}</div>}
              {popup.season && <div><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Season: </strong>{popup.season}</div>}
              {popup.time_of_day && <div><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Time: </strong>{popup.time_of_day}</div>}
              {popup.summary && <div style={{ marginTop: 6 }}>{popup.summary}</div>}
              {popup.tension && <div style={{ marginTop: 4 }}><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Tension: </strong>{popup.tension}</div>}
              {popup.emotional_arc && <div style={{ marginTop: 4 }}><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Arc: </strong>{popup.emotional_arc}</div>}
              {popup.characters_present && <div style={{ marginTop: 4 }}><strong style={{ color: popup._color, fontSize: '0.77em', textTransform: 'uppercase' }}>Characters: </strong>{popup.characters_present}</div>}
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing?.id ? 'Edit Scene' : 'Add Scene'} color={SC_COLOR}>
        <EntryForm fields={SCENE_FIELDS} entry={editing || {}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} color={SC_COLOR} label="Scenes" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{scenes.find(s => s.id === confirmId)?.name || 'this scene'}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm"
              onClick={() => { db.deleteEntry('scenes', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
