import { useState } from 'react'
import Modal from '../components/common/Modal'
import EntryForm from '../components/common/EntryForm'
import { highlight, uid, SL } from '../constants'
import Lightbox from '../components/common/Lightbox'
import ImagePicker from '../components/common/ImagePicker'
import { uploadImage } from '../hooks/useImageUpload'

const ITEM_FIELDS = [
  { k: 'name',         l: 'Name',           t: 'text', r: true },
  { k: 'item_type',    l: 'Type',           t: 'text', p: 'e.g. weapon, jewellery, book' },
  { k: 'holder',       l: 'Current Holder', t: 'charsel' },
  { k: 'shared_with',  l: 'Shared With',    t: 'charsel', p: 'If item passes freely between two people' },
  { k: 'origin',       l: 'Origin',         t: 'text' },
  { k: 'image',        l: 'Image URL',      t: 'text', p: 'Paste image URL or leave blank' },
  { k: 'significance', l: 'Significance',   t: 'ta' },
  { k: 'detail',       l: 'Detail',         t: 'ta' },
]

export default function Items({ db }) {
  const items = db.db.items || []
  const chars = db.db.characters || []
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('holder') // 'holder' | 'list'
  const [expanded, setExpanded] = useState(null)
  const [viewPopup, setViewPopup] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [transferId, setTransferId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [txForm, setTxForm] = useState({ to: '', note: '', when: '' })
  const [uploadingImg, setUploadingImg] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [pickerForItem, setPickerForItem] = useState(null) // item id to assign picked image to

  function holderName(id) {
    if (!id) return 'Unassigned'
    const ch = chars.find(c => c.id === id)
    return ch ? ch.name : id
  }

  async function handleImageUpload(itemId, file) {
    setUploadingImg(itemId)
    const { url, error } = await uploadImage(file, 'items')
    if (url) {
      const item = items.find(x => x.id === itemId)
      if (item) db.upsertEntry('items', { ...item, image: url })
    } else {
      alert(error || 'Upload failed')
    }
    setUploadingImg(null)
  }

  function handleSave(entry) {
    db.upsertEntry('items', entry)
    setModalOpen(false); setEditing(null)
    setExpanded(entry.id)
  }

  function doTransfer() {
    const item = items.find(x => x.id === transferId)
    if (!item || !txForm.to) return
    const transfers = [...(item.transfers || []), {
      from: holderName(item.holder), to: txForm.to,
      note: txForm.note, when: txForm.when
    }]
    const toChar = chars.find(c => c.name === txForm.to || c.id === txForm.to)
    db.upsertEntry('items', { ...item, holder: toChar ? toChar.id : txForm.to, transfers })
    setTransferId(null); setTxForm({ to: '', note: '', when: '' })
  }

  const filtered = items.filter(e =>
    !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())
  )

  // Group by holder
  const grouped = {}
  filtered.forEach(item => {
    const key = item.holder || '__unassigned__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  })

  // Sort holders: characters first (in char order), then unassigned
  const holderOrder = chars
    .filter(c => grouped[c.id])
    .map(c => c.id)
  if (grouped['__unassigned__']) holderOrder.push('__unassigned__')

  function ItemCard({ item, compact = false }) {
    const hasTransfers = (item.transfers || []).length > 0
    return (
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--brd)',
          borderRadius: 8, padding: compact ? 8 : 10, cursor: 'pointer',
          position: 'relative', minWidth: compact ? 100 : 'auto',
        }}
        onClick={() => compact ? setViewPopup(item) : setExpanded(expanded === item.id ? null : item.id)}
        onDoubleClick={e => { e.stopPropagation(); setViewPopup(item) }}
      >
        {/* Image — click to expand, upload only in popup */}
        {item.image && (
          <img src={item.image} alt={item.name}
            style={{ width:'100%', height: compact ? 60 : 80, objectFit:'cover',
              borderRadius:6, marginBottom:6, display:'block', cursor:'pointer' }}
            onClick={ev => { ev.stopPropagation(); setLightbox(item.image) }}
            onError={e => e.target.style.display='none'} />
        )}
        {/* Transfer badge */}
        {hasTransfers && (
          <span style={{ position:'absolute', top:6, right:6, fontSize:9,
            background:'rgba(255,170,51,.2)', color:'var(--sp)',
            border:'1px solid rgba(255,170,51,.3)', borderRadius:4,
            padding:'1px 4px' }}>↔</span>
        )}
        <div style={{ fontSize: compact ? 10 : 11, fontWeight:600, lineHeight:1.3,
          color:'var(--tx)', marginBottom:2 }}>
          {item.name}
        </div>
        {item.item_type && (
          <div style={{ fontSize:9, color:'var(--ci)', textTransform:'uppercase',
            letterSpacing:'.04em' }}>{item.item_type}</div>
        )}
        {!compact && item.status && (
          <div style={{ marginTop:4 }}>
            <span className={`badge badge-${item.status}`}>{SL[item.status]}</span>
          </div>
        )}
      </div>
    )
  }

  // Full popup
  function ItemPopup({ item, onClose }) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.85)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={onClose}>
        <div style={{ background:'var(--sf)', border:'1px solid var(--brd)',
          borderRadius:12, padding:20, maxWidth:520, width:'100%',
          maxHeight:'85vh', overflowY:'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:15,
              color:'var(--ci)', flex:1 }}>{item.name}</div>
            <button onClick={onClose} style={{ background:'none', border:'none',
              cursor:'pointer', fontSize:18, color:'var(--mut)', marginLeft:10 }}>✕</button>
          </div>
          {/* Image — with lightbox, upload, and browse */}
          <div style={{ marginBottom:14 }}>
            {item.image ? (
              <img src={item.image} alt={item.name}
                style={{ width:'100%', maxHeight:200, objectFit:'contain',
                  borderRadius:8, background:'var(--card)', cursor:'pointer', display:'block' }}
                onClick={() => setLightbox(item.image)}
                onError={e => e.target.style.display='none'} />
            ) : (
              <div style={{ width:'100%', height:60, border:'1px dashed var(--brd)',
                borderRadius:8, background:'var(--card)', display:'flex',
                alignItems:'center', justifyContent:'center',
                color:'var(--mut)', fontSize:11 }}>No image</div>
            )}
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <label className="btn btn-sm btn-outline" style={{ cursor:'pointer', fontSize:10 }}>
                {uploadingImg === item.id ? 'Uploading…' : '⬆ Upload'}
                <input type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => { const f=e.target.files[0]; if(f) handleImageUpload(item.id, f); e.target.value='' }} />
              </label>
              <button className="btn btn-sm btn-outline" style={{ fontSize:10 }}
                onClick={() => { onClose(); setPickerForItem(item.id) }}>
                🖼 Browse Library
              </button>
              {item.image && (
                <button className="btn btn-sm btn-outline"
                  style={{ fontSize:10, color:'#ff3355', borderColor:'#ff335544' }}
                  onClick={() => { const it = items.find(x=>x.id===item.id); if(it) db.upsertEntry('items',{...it,image:null}) }}>
                  Remove
                </button>
              )}
            </div>
          </div>
          {[
            ['Type', item.item_type],
            ['Holder', holderName(item.holder)],
            ['Shared With', item.shared_with ? holderName(item.shared_with) : null],
            ['Origin', item.origin],
            ['Status', item.status ? SL[item.status] : null],
            ['Books', (item.books||[]).join(', ')],
          ].filter(([,v]) => v).map(([label, val]) => (
            <div key={label} style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ci)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:12, color:'var(--tx)' }}>{val}</div>
            </div>
          ))}
          {item.significance && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ci)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Significance</div>
              <div style={{ fontSize:12, color:'var(--tx)', lineHeight:1.6 }}>{item.significance}</div>
            </div>
          )}
          {item.detail && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ci)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>Detail</div>
              <div style={{ fontSize:12, color:'var(--tx)', lineHeight:1.6 }}>{item.detail}</div>
            </div>
          )}
          {(item.transfers||[]).length > 0 && (
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--brd)' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--sp)',
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                ↔ Transfer History
              </div>
              {item.transfers.map((t, i) => (
                <div key={i} style={{ fontSize:11, color:'var(--dim)', marginBottom:3 }}>
                  {t.from||'?'} → {t.to||'?'}
                  {t.note ? ` · ${t.note}` : ''}
                  {t.when ? <span style={{ color:'var(--mut)' }}> ({t.when})</span> : ''}
                </div>
              ))}
            </div>
          )}
          {item.notes && (
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--brd)',
              fontSize:11, color:'var(--dim)', lineHeight:1.6 }}>{item.notes}</div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
            <button className="btn btn-outline btn-sm"
              style={{ color:'var(--ci)', borderColor:'var(--ci)44' }}
              onClick={() => { onClose(); setEditing(item); setModalOpen(true) }}>✎ Edit</button>
            <button className="btn btn-outline btn-sm"
              style={{ color:'var(--ci)', borderColor:'var(--ci)44' }}
              onClick={() => { onClose(); setTransferId(item.id) }}>↔ Transfer</button>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="tbar">
        <input className="sx" placeholder="Search items…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <div style={{ display:'flex', gap:6 }}>
          <button className={`btn btn-sm btn-outline ${viewMode==='holder'?'active':''}`}
            style={{ fontSize:10 }} onClick={() => setViewMode('holder')}>By Holder</button>
          <button className={`btn btn-sm btn-outline ${viewMode==='list'?'active':''}`}
            style={{ fontSize:10 }} onClick={() => setViewMode('list')}>List</button>
        </div>
        <button className="btn btn-primary btn-sm" style={{ background:'var(--ci)' }}
          onClick={() => { setEditing({}); setModalOpen(true) }}>+ Add</button>
      </div>

      {/* Grouped by holder view */}
      {viewMode === 'holder' && (
        <div>
          {holderOrder.length === 0 && (
            <div className="empty"><div className="empty-icon">⚔</div><p>No items yet.</p></div>
          )}
          {holderOrder.map(holderId => {
            const holderItems = grouped[holderId] || []
            const char = chars.find(c => c.id === holderId)
            const name = holderId === '__unassigned__' ? 'Unassigned' : holderName(holderId)
            return (
              <div key={holderId} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  {char?.reference_image && (
                    <img src={char.reference_image} alt={name}
                      style={{ width:28, height:28, borderRadius:'50%',
                        objectFit:'cover', border:'2px solid var(--ci)' }}
                      onError={e => e.target.style.display='none'} />
                  )}
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--ci)',
                    fontFamily:"'Cinzel',serif" }}>{name}</div>
                  <div style={{ fontSize:10, color:'var(--mut)' }}>
                    {holderItems.length} item{holderItems.length!==1?'s':''}
                  </div>
                </div>
                <div style={{ display:'grid',
                  gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:8 }}>
                  {holderItems.map(item => (
                    <ItemCard key={item.id} item={item} compact />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="cg">
          {!filtered.length && (
            <div className="empty"><div className="empty-icon">⚔</div><p>No items yet.</p></div>
          )}
          {filtered.map((e, i) => {
            const isOpen = expanded === e.id
            return (
              <div key={e.id} className="entry-card"
                style={{ '--card-color':'var(--ci)', background:i%2===1?'rgba(255,255,255,.01)':undefined }}
                onClick={() => setExpanded(isOpen ? null : e.id)}
                onDoubleClick={ev => { ev.stopPropagation(); setViewPopup(e) }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div className="entry-title"
                    dangerouslySetInnerHTML={{ __html: highlight(e.name||'', search) }} />
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {(e.transfers||[]).length > 0 && (
                      <span style={{ fontSize:9, color:'var(--sp)' }}>↔</span>
                    )}
                    {e.holder && <div style={{ fontSize:10, color:'var(--ci)' }}>{holderName(e.holder)}</div>}
                  </div>
                </div>
                <div className="entry-meta">
                  {e.status && <span className={`badge badge-${e.status}`}>{SL[e.status]}</span>}
                  {(e.books||[]).map(b => <span key={b} className="badge badge-book">{b}</span>)}
                </div>
                {isOpen && (
                  <>
                    <div className="entry-detail">
                      {e.origin && <div style={{ marginBottom:3 }}><strong style={{ color:'var(--ci)',fontSize:9,textTransform:'uppercase' }}>Origin: </strong>{e.origin}</div>}
                      {e.significance && <div style={{ marginBottom:3 }}><strong style={{ color:'var(--ci)',fontSize:9,textTransform:'uppercase' }}>Significance: </strong>{e.significance}</div>}
                      {e.detail && <div style={{ marginBottom:3 }}><strong style={{ color:'var(--ci)',fontSize:9,textTransform:'uppercase' }}>Detail: </strong>{e.detail}</div>}
                      {e.shared_with && <div style={{ marginBottom:3 }}><strong style={{ color:'var(--ci)',fontSize:9,textTransform:'uppercase' }}>Shared with: </strong>{holderName(e.shared_with)}</div>}
                      {(e.transfers||[]).length > 0 && (
                        <details style={{ marginTop:6 }} onClick={ev => ev.stopPropagation()}>
                          <summary style={{ fontSize:10, color:'var(--ci)', cursor:'pointer' }}>Transfer History ({e.transfers.length})</summary>
                          {e.transfers.map((t,ti) => (
                            <div key={ti} style={{ fontSize:10, color:'var(--dim)', padding:'2px 0' }}>
                              {t.from||'?'} → {t.to||'?'}{t.note?` · ${t.note}`:''}{t.when?<span style={{ color:'var(--mut)' }}> ({t.when})</span>:''}
                            </div>
                          ))}
                        </details>
                      )}
                    </div>
                    {e.notes && <div className="entry-notes">{e.notes}</div>}
                    <div className="entry-actions">
                      <button className="btn btn-sm btn-outline" style={{ color:'var(--ci)',borderColor:'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setEditing(e); setModalOpen(true) }}>✎ Edit</button>
                      <button className="btn btn-sm btn-outline" style={{ color:'var(--ci)',borderColor:'var(--ci)' }} onClick={ev => { ev.stopPropagation(); setTransferId(e.id) }}>↔ Transfer</button>
                      <button className="btn btn-sm btn-outline" style={{ color:'#ff3355',borderColor:'#ff335544' }} onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}>✕</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Popups and modals */}
      {viewPopup && <ItemPopup item={viewPopup} onClose={() => setViewPopup(null)} />}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <ImagePicker
        open={!!pickerForItem}
        db={db}
        onClose={() => setPickerForItem(null)}
        onPick={url => {
          const item = items.find(x => x.id === pickerForItem)
          if (item) db.upsertEntry('items', { ...item, image: url })
          setPickerForItem(null)
        }}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        title={`${editing?.id?'Edit':'Add'} Item`} color="var(--ci)">
        <EntryForm fields={ITEM_FIELDS} entry={editing||{}} onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }} color="var(--ci)" db={db} />
      </Modal>

      <Modal open={!!transferId} onClose={() => setTransferId(null)} title="Transfer Item" color="var(--ci)">
        <div className="field"><label>Transfer To</label>
          <select value={txForm.to} onChange={e => setTxForm(p => ({...p,to:e.target.value}))}>
            <option value="">— Pick character —</option>
            {chars.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Note (optional)</label>
          <input value={txForm.note} onChange={e => setTxForm(p => ({...p,note:e.target.value}))} />
        </div>
        <div className="field"><label>When</label>
          <input value={txForm.when} onChange={e => setTxForm(p => ({...p,when:e.target.value}))}
            placeholder="e.g. End of Book 1" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setTransferId(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background:'var(--ci)' }} onClick={doTransfer}>Transfer</button>
        </div>
      </Modal>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{items.find(e=>e.id===confirmId)?.name}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('items',confirmId); setConfirmId(null); if(expanded===confirmId) setExpanded(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
