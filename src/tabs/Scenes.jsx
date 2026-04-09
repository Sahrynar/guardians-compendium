import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, BKS, uid } from '../constants'

const SCENE_FIELDS = [
  { k: 'name',             l: 'Scene',              t: 'text', r: true },
  { k: 'book',             l: 'Book',               t: 'sel', o: ['', ...BKS] },
  { k: 'chapter',          l: 'Chapter',            t: 'text' },
  { k: 'scene_date_hc',    l: 'Date (HC)',           t: 'text' },
  { k: 'season',           l: 'Season',             t: 'sel', o: ['','Summer','Harvest','Winter','Spring'] },
  { k: 'time_of_day',      l: 'Time',               t: 'sel', o: ['','Dawn','Morning','Midday','Afternoon','Evening','Night','Midnight'] },
  { k: 'location_id',      l: 'Location',           t: 'locsel' },
  { k: 'characters_present',l:'Characters',          t: 'charpick' },
  { k: 'items_present',    l: 'Items',              t: 'itempick' },
  { k: 'animals_bonds',    l: 'Animals/Bonds',      t: 'text' },
  { k: 'clothing_refs',    l: 'Clothing/Appearance', t: 'text' },
  { k: 'summary',          l: 'Summary',            t: 'ta' },
  { k: 'tension',          l: 'Tension',            t: 'text' },
  { k: 'emotional_arc',    l: 'Emotional Arc',      t: 'text' },
  { k: 'sort_order',       l: 'Sort #',             t: 'text' },
]

export default function Scenes({ db }) {
  const scenes = db.db.scenes || []
  const [bookFilter, setBookFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [dragSrc, setDragSrc] = useState(null)

  // Drag state refs
  let dragIdx = null

  const allBooks = [...new Set(scenes.map(s => s.book).filter(Boolean))]

  const filtered = scenes
    .filter(s => {
      const mb = bookFilter === 'all' || s.book === bookFilter
      const ms = !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase())
      return mb && ms
    })
    .sort((a,b) => (parseFloat(a.sort_order)||0) - (parseFloat(b.sort_order)||0))

  function locName(id) {
    const l = (db.db.locations||[]).find(l => l.id === id)
    return l ? l.name : ''
  }

  function handleSave(entry) {
    // Auto-create timeline event from scene if it has a date
    if (entry.scene_date_hc && !entry.id) {
      const evId = uid()
      db.upsertEntry('timeline', {
        id: evId, name: `Scene: ${entry.name}`, date_hc: entry.scene_date_hc,
        sort_order: '', era: entry.book ? `${entry.book}` : '',
        detail: entry.summary || '', status: 'provisional', books: entry.book ? [entry.book] : [],
        relationships: [], created: new Date().toISOString()
      })
    }
    db.upsertEntry('scenes', entry)
    setModalOpen(false); setEditing(null)
  }

  return (
    <div>
      <div className="tbar">
        <input className="sx" placeholder="Search scenes…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm" style={{ background: '#38b000', color: '#000' }} onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Book filter */}
      <div className="tbar" style={{ paddingTop: 0 }}>
        <div className="filter-group">
          <button className={`fp ${bookFilter==='all'?'active':''}`} style={{ color: '#38b000' }} onClick={() => setBookFilter('all')}>All Books</button>
          {allBooks.map(b => (
            <button key={b} className={`fp ${bookFilter===b?'active':''}`} style={{ color: '#38b000' }} onClick={() => setBookFilter(bookFilter===b?'all':b)}>{b}</button>
          ))}
        </div>
      </div>

      {!filtered.length && (
        <div className="empty"><div className="empty-icon">🎬</div><p>No scenes yet{bookFilter !== 'all' ? ` for ${bookFilter}` : ''}.</p></div>
      )}

      <div style={{ minHeight: 60, padding: 4, borderRadius: 'var(--r)', background: 'var(--sf)', border: '1px dashed var(--brd)' }}>
        {filtered.map((s, i) => {
          const loc = locName(s.location_id)
          return (
            <div
              key={s.id}
              className="scene-card"
              draggable
              onDragStart={() => { dragIdx = i }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
              onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
              onDrop={e => {
                e.currentTarget.classList.remove('drag-over')
                if (dragIdx === null || dragIdx === i) return
                const reordered = [...filtered]
                const [moved] = reordered.splice(dragIdx, 1)
                reordered.splice(i, 0, moved)
                reordered.forEach((sc, idx) => db.upsertEntry('scenes', { ...sc, sort_order: String(idx * 10) }))
              }}
            >
              <div style={{ fontSize: '0.69em', color: '#38b000', fontWeight: 700 }}>
                {s.chapter || ''}{s.chapter && s.book ? ' · ' : ''}{s.book || ''}
                {s.scene_date_hc ? ` · ${s.scene_date_hc}` : ''}
                {s.season ? ` · ${s.season}` : ''}
                {s.time_of_day ? ` · ${s.time_of_day}` : ''}
              </div>
              <div style={{ fontSize: '0.92em', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: highlight(s.name||'', search) }} />
              {loc && <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>📍 {loc}</div>}
              {s.characters_present && <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>👤 {s.characters_present}</div>}
              {s.items_present && <div style={{ fontSize: '0.69em', color: 'var(--mut)' }}>⚔ {s.items_present}</div>}
              {s.summary && <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 2 }}>{s.summary.slice(0,120)}{s.summary.length>120?'…':''}</div>}
              {s.tension && <div style={{ fontSize: '0.69em', color: 'var(--ccn)' }}>⚡ {s.tension}</div>}
              <div className="entry-actions" style={{ marginTop: 3 }}>
                <button className="btn btn-sm btn-outline" style={{ color: '#38b000', borderColor: '#38b000' }} onClick={e => { e.stopPropagation(); setEditing(s); setModalOpen(true) }}>✎</button>
                <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={e => { e.stopPropagation(); setConfirmId(s.id) }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={`${editing?.id?'Edit':'Add'} Scene`} color="var(--csc)">
        <EntryForm fields={SCENE_FIELDS} entry={editing||{}} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--csc)" db={db} />
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{scenes.find(s=>s.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('scenes',confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
