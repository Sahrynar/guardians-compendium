import { useState, useMemo } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { uid, RAINBOW, BKS } from '../constants'

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

  function changeCPR(sz) {
    setCardsPerRow(sz)
    try { localStorage.setItem('colsize_scenes', sz) } catch {}
  }

  const bookOrder = BOOK_ORDER
  const sorted = useMemo(() => [...scenes].sort((a, b) => {
    const bi = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book)
    if (bi !== 0) return bi
    return (parseFloat(a.sort_order) || 0) - (parseFloat(b.sort_order) || 0)
  }), [scenes])

  const withIdx = useMemo(() => sorted.map((s, i) => ({ ...s, _gi: i })), [sorted])

  const filtered = useMemo(() => withIdx.filter(s => {
    const mb = bookFilter === 'all' || s.book === bookFilter
    const ms = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
    return mb && ms
  }), [withIdx, bookFilter, search])

  const cpr = CARDS_PER_ROW[cardsPerRow] || 4
  const rows = useMemo(() => {
    const r = []
    for (let i = 0; i < filtered.length; i += cpr) r.push(filtered.slice(i, i + cpr))
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
        {/* Size picker LEFT */}
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

      {/* Wrapped timeline */}
      {rows.map((row, ri) => {
        // Check if row starts a new chapter vs previous row's last scene
        const prevRowLast = ri > 0 ? rows[ri-1][rows[ri-1].length-1] : null
        const rowStartsNewChapter = !prevRowLast || 
          prevRowLast.chapter !== row[0]?.chapter || prevRowLast.book !== row[0]?.book

        return (
          <div key={ri}>
            {/* Row separator with wrap indicator */}
            {ri > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: 6 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--brd)', opacity: 0.4 }} />
                <span style={{ fontSize: '0.69em', color: 'var(--mut)', opacity: 0.6 }}>↩</span>
                <div style={{ flex: 1, height: 1, background: 'var(--brd)', opacity: 0.4 }} />
              </div>
            )}

            {/* Chapter header band — shown at start of each chapter (first row of that chapter) */}
            {rowStartsNewChapter && row[0]?.chapter && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                padding: '3px 8px', borderRadius: 6,
                background: `${RAINBOW[row[0]._gi % 18]}18`,
                borderLeft: `3px solid ${RAINBOW[row[0]._gi % 18]}`,
              }}>
                <span style={{ fontSize: '0.69em', fontWeight: 700, color: RAINBOW[row[0]._gi % 18],
                  fontFamily: "'Cinzel', serif", letterSpacing: '.04em' }}>
                  {row[0].book ? row[0].book.replace('Book ', 'B') + ' · ' : ''}Ch.{row[0].chapter}
                </span>
              </div>
            )}

            {/* Scene cards row — full width */}
            <div style={{ display: 'flex', width: '100%', gap: 3, alignItems: 'stretch', marginBottom: 2 }}>
              {row.map((scene, ci) => {
                const color = RAINBOW[scene._gi % 18]
                const prevScene = ci > 0 ? row[ci-1] : prevRowLast
                const isNewChapter = !prevScene || 
                  prevScene.chapter !== scene.chapter || prevScene.book !== scene.book

                return (
                  <div key={scene.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {/* Arrow between chapters (not between every scene) */}
                    {ci > 0 && (
                      <div style={{
                        color: isNewChapter ? color : 'var(--brd)',
                        fontSize: isNewChapter ? '1em' : '0.77em',
                        fontWeight: isNewChapter ? 700 : 400,
                        margin: '0 2px', flexShrink: 0,
                        opacity: isNewChapter ? 1 : 0.4,
                      }}>
                        {isNewChapter ? '→' : '›'}
                      </div>
                    )}

                    {/* Card — flex: 1 fills row width */}
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
                      }}>{scene._gi + 1}</div>

                      {/* Chapter badge on card (when chapter changes mid-row) */}
                      {isNewChapter && ci > 0 && scene.chapter && (
                        <div style={{ fontSize: '0.55em', color, fontWeight: 700, marginBottom: 2,
                          textTransform: 'uppercase', letterSpacing: '.03em' }}>
                          {scene.book ? scene.book.replace('Book ','B') : ''}Ch.{scene.chapter}
                        </div>
                      )}

                      <div style={{
                        fontSize: cardsPerRow === 'XS' ? '0.62em' : cardsPerRow === 'S' ? '0.69em' : '0.77em',
                        fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: cardsPerRow === 'XL' ? 4 : cardsPerRow === 'L' ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {scene.name || '(untitled)'}
                      </div>

                      {(cardsPerRow === 'L' || cardsPerRow === 'XL') && scene.scene_date_hc && (
                        <div style={{ fontSize: '0.62em', color: 'var(--mut)', marginTop: 2 }}>{scene.scene_date_hc}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Scene popup */}
      {popup && (
        <div className="modal-overlay open" onClick={() => setPopup(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setPopup(null)}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ background: RAINBOW[popup._gi % 18], color: '#000',
                fontSize: '0.77em', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                Scene {popup._gi + 1}
              </div>
              {popup.book && <span style={{ fontSize: '0.77em', color: 'var(--dim)', border: '1px solid var(--brd)', padding: '1px 6px', borderRadius: 4 }}>{popup.book}</span>}
              {popup.chapter && <span style={{ fontSize: '0.77em', color: 'var(--dim)' }}>Ch.{popup.chapter}</span>}
            </div>
            <div className="modal-title" style={{ color: RAINBOW[popup._gi % 18] }}>{popup.name || '(untitled)'}</div>
            <div style={{ marginTop: 8, fontSize: '0.85em', lineHeight: 1.6 }}>
              {popup.scene_date_hc && <div><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Date: </strong>{popup.scene_date_hc}</div>}
              {popup.season && <div><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Season: </strong>{popup.season}</div>}
              {popup.time_of_day && <div><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Time: </strong>{popup.time_of_day}</div>}
              {popup.summary && <div style={{ marginTop: 6 }}>{popup.summary}</div>}
              {popup.tension && <div style={{ marginTop: 4 }}><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Tension: </strong>{popup.tension}</div>}
              {popup.emotional_arc && <div style={{ marginTop: 4 }}><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Arc: </strong>{popup.emotional_arc}</div>}
              {popup.characters_present && <div style={{ marginTop: 4 }}><strong style={{ color: RAINBOW[popup._gi % 18], fontSize: '0.77em', textTransform: 'uppercase' }}>Characters: </strong>{popup.characters_present}</div>}
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
