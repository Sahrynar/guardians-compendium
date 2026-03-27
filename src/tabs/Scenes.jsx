import { useState } from 'react'
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

const BOOK_COLORS = {
  'Pre-Series':     'var(--ct)',
  'Book 1':         'var(--cc)',
  'Book 2':         'var(--cl)',
  'Between B1–B2':  'var(--cca)',
  'Book 3':         'var(--ci)',
  'Between B2–B3':  'var(--cca)',
  'Book 4':         'var(--cwr)',
  'Book 5':         'var(--cfl)',
}

export default function Scenes({ db }) {
  const scenes = db.db.scenes || []
  const [bookFilter, setBookFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  let dragIdx = null

  const allBooks = [...new Set(scenes.map(s => s.book).filter(Boolean))]

  const filtered = scenes
    .filter(s => {
      const mb = bookFilter === 'all' || s.book === bookFilter
      const ms = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
      return mb && ms
    })
    .sort((a, b) => (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0))

  // Group by book
  const bookOrder = bookFilter === 'all'
    ? [...new Set(filtered.map(s => s.book || 'Unassigned'))]
    : [bookFilter]

  const grouped = {}
  filtered.forEach(s => {
    const key = s.book || 'Unassigned'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  function locName(id) {
    const l = (db.db.locations||[]).find(l => l.id === id)
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

  // Parse character string into tags
  function charTags(str) {
    if (!str) return []
    return str.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Scene card
  function SceneCard({ s }) {
    const loc = locName(s.location_id)
    const chars = charTags(s.characters_present)
    const bookCol = BOOK_COLORS[s.book] || 'var(--csc)'
    return (
      <div className="scene-card"
        style={{ borderLeft: `3px solid ${bookCol}`, cursor:'pointer' }}
        onDoubleClick={e => { e.stopPropagation(); setViewPopup(s) }}
        draggable
        onDragStart={() => { dragIdx = filtered.indexOf(s) }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
        onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
        onDrop={e => {
          e.currentTarget.classList.remove('drag-over')
          const toIdx = filtered.indexOf(s)
          if (dragIdx === null || dragIdx === toIdx) return
          const reordered = [...filtered]
          const [moved] = reordered.splice(dragIdx, 1)
          reordered.splice(toIdx, 0, moved)
          reordered.forEach((sc, idx) => db.upsertEntry('scenes', { ...sc, sort_order: String(idx * 10) }))
        }}>
        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'flex-start', marginBottom:4 }}>
          <div>
            <div style={{ fontSize:9, color:bookCol, fontWeight:700, marginBottom:2 }}>
              {[s.chapter && `Ch. ${s.chapter}`, s.scene_date_hc, s.season, s.time_of_day]
                .filter(Boolean).join(' · ')}
            </div>
            <div style={{ fontSize:12, fontWeight:600, lineHeight:1.3 }}
              dangerouslySetInnerHTML={{ __html: highlight(s.name||'', search) }} />
          </div>
          <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:8 }}>
            <button className="btn btn-sm btn-outline"
              style={{ fontSize:9, color:'var(--csc)', borderColor:'var(--csc)44', padding:'2px 6px' }}
              onClick={e => { e.stopPropagation(); setEditing(s); setModalOpen(true) }}>✎</button>
            <button className="btn btn-sm btn-outline"
              style={{ fontSize:9, color:'#ff3355', borderColor:'#ff335544', padding:'2px 6px' }}
              onClick={e => { e.stopPropagation(); setConfirmId(s.id) }}>✕</button>
          </div>
        </div>

        {/* Location */}
        {loc && (
          <div style={{ fontSize:9, color:'var(--mut)', marginBottom:3 }}>📍 {loc}</div>
        )}

        {/* Character tags */}
        {chars.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:4 }}>
            {chars.map(c => (
              <span key={c} style={{ fontSize:9, padding:'1px 6px',
                background:'rgba(201,102,255,.12)', color:'var(--cc)',
                border:'1px solid rgba(201,102,255,.25)', borderRadius:10 }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Items & animals inline */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom: s.summary ? 4 : 0 }}>
          {s.items_present && (
            <div style={{ fontSize:9, color:'var(--ci)' }}>⚔ {s.items_present}</div>
          )}
          {s.animals_bonds && (
            <div style={{ fontSize:9, color:'var(--cl)' }}>🐴 {s.animals_bonds}</div>
          )}
        </div>

        {/* Summary preview */}
        {s.summary && (
          <div style={{ fontSize:10, color:'var(--dim)', lineHeight:1.5,
            marginTop:2, borderTop:'1px solid var(--brd)', paddingTop:4 }}>
            {s.summary.slice(0,150)}{s.summary.length>150?'…':''}
          </div>
        )}

        {s.tension && (
          <div style={{ fontSize:9, color:'var(--ccn)', marginTop:3 }}>⚡ {s.tension}</div>
        )}

        {/* Double-click hint */}
        <div style={{ fontSize:8, color:'var(--mut)', marginTop:4, textAlign:'right' }}>
          double-click for full view
        </div>
      </div>
    )
  }

  // Full scene popup
  function ScenePopup({ s, onClose }) {
    const loc = locName(s.location_id)
    const chars = charTags(s.characters_present)
    const items = s.items_present ? s.items_present.split(',').map(x=>x.trim()).filter(Boolean) : []
    const animals = s.animals_bonds ? s.animals_bonds.split(',').map(x=>x.trim()).filter(Boolean) : []
    const bookCol = BOOK_COLORS[s.book] || 'var(--csc)'
    return (
      <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.85)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={onClose}>
        <div style={{ background:'var(--sf)', border:`1px solid ${bookCol}44`,
          borderRadius:12, padding:20, maxWidth:580, width:'100%',
          maxHeight:'88vh', overflowY:'auto' }}
          onClick={e => e.stopPropagation()}>
          {/* Title */}
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:bookCol, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                {[s.book, s.chapter && `Ch. ${s.chapter}`].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:15,
                color:'var(--tx)', lineHeight:1.3 }}>{s.name}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none',
              cursor:'pointer', fontSize:18, color:'var(--mut)', marginLeft:10 }}>✕</button>
          </div>

          {/* Meta */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14,
            padding:10, background:'var(--card)', borderRadius:8 }}>
            {loc && <div style={{ fontSize:10 }}>📍 <strong>{loc}</strong></div>}
            {s.scene_date_hc && <div style={{ fontSize:10 }}>📅 {s.scene_date_hc}</div>}
            {s.season && <div style={{ fontSize:10 }}>🌿 {s.season}</div>}
            {s.time_of_day && <div style={{ fontSize:10 }}>🕐 {s.time_of_day}</div>}
          </div>

          {/* Characters */}
          {chars.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--cc)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                👤 Characters Present
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {chars.map(c => (
                  <span key={c} style={{ fontSize:11, padding:'3px 10px',
                    background:'rgba(201,102,255,.12)', color:'var(--cc)',
                    border:'1px solid rgba(201,102,255,.25)', borderRadius:12 }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          {items.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ci)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                ⚔ Items Present
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {items.map(it => (
                  <span key={it} style={{ fontSize:11, padding:'3px 10px',
                    background:'rgba(255,112,64,.12)', color:'var(--ci)',
                    border:'1px solid rgba(255,112,64,.25)', borderRadius:12 }}>{it}</span>
                ))}
              </div>
            </div>
          )}

          {/* Animals */}
          {animals.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--cl)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                🐴 Animals / Bonds
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {animals.map(a => (
                  <span key={a} style={{ fontSize:11, padding:'3px 10px',
                    background:'rgba(122,204,122,.12)', color:'var(--cl)',
                    border:'1px solid rgba(122,204,122,.25)', borderRadius:12 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Shared items — auto-detected from character holders */}
          {(() => {
            const chars = charTags(s.characters_present)
            const allItems = db.db.items || []
            const allChars = db.db.characters || []
            // Find items where holder OR shared_with match any present character
            const sharedItems = allItems.filter(it => {
              if (!it.shared_with) return false
              const holderChar = allChars.find(c => c.id === it.holder)
              const sharedChar = allChars.find(c => c.id === it.shared_with)
              const holderName = holderChar?.name || it.holder || ''
              const sharedName = sharedChar?.name || it.shared_with || ''
              const holderPresent = chars.some(c => c.toLowerCase() === holderName.toLowerCase())
              const sharedPresent = chars.some(c => c.toLowerCase() === sharedName.toLowerCase())
              return holderPresent || sharedPresent
            })
            if (!sharedItems.length) return null
            return (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--sp)',
                  textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                  ↔ Shared Items (auto-detected)
                </div>
                {sharedItems.map(it => {
                  const holderChar = allChars.find(c => c.id === it.holder)
                  return (
                    <div key={it.id} style={{ fontSize:11, padding:'4px 8px',
                      background:'rgba(255,170,51,.08)', borderRadius:6,
                      border:'1px solid rgba(255,170,51,.2)', marginBottom:4 }}>
                      <strong>{it.name}</strong>
                      <span style={{ color:'var(--mut)', marginLeft:6 }}>
                        currently with {holderChar?.name || it.holder || '?'}
                      </span>
                    </div>
                  )
                })}
                <div style={{ fontSize:9, color:'var(--mut)', marginTop:4 }}>
                  If this is wrong, edit the item's holder in the Items tab.
                </div>
              </div>
            )
          })()}

          {/* Clothing */}
          {s.clothing_refs && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--cwr)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                👗 Clothing / Appearance
              </div>
              <div style={{ fontSize:11, color:'var(--tx)', lineHeight:1.6 }}>{s.clothing_refs}</div>
            </div>
          )}

          {/* Summary */}
          {s.summary && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--dim)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
                Summary
              </div>
              <div style={{ fontSize:12, color:'var(--tx)', lineHeight:1.7,
                whiteSpace:'pre-wrap' }}>{s.summary}</div>
            </div>
          )}

          {/* Tension / Emotional arc */}
          {(s.tension || s.emotional_arc) && (
            <div style={{ display:'flex', gap:12, marginBottom:12,
              padding:10, background:'var(--card)', borderRadius:8 }}>
              {s.tension && (
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:'var(--ccn)', fontWeight:700,
                    marginBottom:2 }}>⚡ Tension</div>
                  <div style={{ fontSize:11, color:'var(--tx)' }}>{s.tension}</div>
                </div>
              )}
              {s.emotional_arc && (
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:'var(--cca)', fontWeight:700,
                    marginBottom:2 }}>💫 Emotional Arc</div>
                  <div style={{ fontSize:11, color:'var(--tx)' }}>{s.emotional_arc}</div>
                </div>
              )}
            </div>
          )}

          {s.notes && (
            <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.6,
              borderTop:'1px solid var(--brd)', paddingTop:10, marginTop:10 }}>{s.notes}</div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
            <button className="btn btn-outline btn-sm"
              style={{ color:'var(--csc)', borderColor:'var(--csc)44' }}
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
        <input className="sx" placeholder="Search scenes…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm"
          style={{ background:'var(--csc)', color:'#000' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Book filter */}
      <div className="tbar" style={{ paddingTop:0 }}>
        <div className="filter-group">
          <button className={`fp ${bookFilter==='all'?'active':''}`}
            style={{ color:'var(--csc)' }} onClick={() => setBookFilter('all')}>All Books</button>
          {allBooks.map(b => (
            <button key={b} className={`fp ${bookFilter===b?'active':''}`}
              style={{ color: BOOK_COLORS[b] || 'var(--csc)' }}
              onClick={() => setBookFilter(bookFilter===b?'all':b)}>{b}</button>
          ))}
        </div>
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">🎬</div>
          <p>No scenes yet{bookFilter!=='all'?` for ${bookFilter}`:''}</p>
        </div>
      )}

      {/* Grouped by book */}
      {bookOrder.map(book => {
        const bookScenes = grouped[book] || []
        if (!bookScenes.length) return null
        const bookCol = BOOK_COLORS[book] || 'var(--csc)'
        return (
          <div key={book} style={{ marginBottom:20 }}>
            {bookFilter === 'all' && (
              <div style={{ fontSize:11, fontWeight:700, color:bookCol,
                fontFamily:"'Cinzel',serif", marginBottom:8,
                borderBottom:`1px solid ${bookCol}33`, paddingBottom:4 }}>
                {book} <span style={{ fontSize:10, color:'var(--mut)',
                  fontFamily:'sans-serif', fontWeight:400 }}>
                  · {bookScenes.length} scene{bookScenes.length!==1?'s':''}
                </span>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {bookScenes.map(s => <SceneCard key={s.id} s={s} />)}
            </div>
          </div>
        )
      })}

      {viewPopup && <ScenePopup s={viewPopup} onClose={() => setViewPopup(null)} />}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id?'Edit':'Add'} Scene`} color="var(--csc)">
        <EntryForm fields={SCENE_FIELDS} entry={editing||{}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
          color="var(--csc)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{scenes.find(s=>s.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm"
              onClick={() => { db.deleteEntry('scenes',confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
