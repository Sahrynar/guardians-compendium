// Image picker modal — browse all images in the Compendium and pick one
// Usage: <ImagePicker open={bool} onPick={url => ...} onClose={() => ...} db={db} />

import { useState, useMemo } from 'react'
import Lightbox from './Lightbox'

const CATEGORIES = [
  { key: 'items',     label: 'Items',      field: 'image' },
  { key: 'characters',label: 'Characters', field: 'reference_image' },
  { key: 'locations', label: 'Locations',  field: 'image' },
  { key: 'wardrobe',  label: 'Wardrobe',   field: 'image' },
]

export default function ImagePicker({ open, onPick, onClose, db }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [lightbox, setLightbox] = useState(null)

  const allImages = useMemo(() => {
    const imgs = []
    CATEGORIES.forEach(({ key, label, field }) => {
      ;(db?.db[key] || []).forEach(entry => {
        const url = entry[field] || (field === 'reference_image' ? entry.portrait_canvas : null)
        if (url && url.startsWith('http')) {
          imgs.push({
            url, cat: key, catLabel: label,
            name: entry.display_name || entry.name || entry.id,
            entryId: entry.id,
          })
        }
      })
    })
    return imgs
  }, [db])

  const filtered = allImages.filter(img => {
    const matchCat = filterCat === 'all' || img.cat === filterCat
    const matchSearch = !search || img.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (!open) return null

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.85)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={onClose}>
        <div style={{ background:'var(--sf)', border:'1px solid var(--brd)',
          borderRadius:12, padding:20, maxWidth:620, width:'100%',
          maxHeight:'88vh', display:'flex', flexDirection:'column' }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:12 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:'var(--cl)' }}>
              🖼 Image Library
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none',
              cursor:'pointer', fontSize:20, color:'var(--mut)' }}>✕</button>
          </div>

          {/* Search + filter */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <input className="sx" style={{ flex:1, minWidth:120 }}
              placeholder="Search by name…" value={search}
              onChange={e => setSearch(e.target.value)} />
            <div style={{ display:'flex', gap:4 }}>
              <button className={`fp ${filterCat==='all'?'active':''}`}
                style={{ fontSize:10 }} onClick={() => setFilterCat('all')}>All</button>
              {CATEGORIES.map(c => (
                <button key={c.key}
                  className={`fp ${filterCat===c.key?'active':''}`}
                  style={{ fontSize:10 }}
                  onClick={() => setFilterCat(filterCat===c.key?'all':c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div style={{ fontSize:10, color:'var(--mut)', marginBottom:8 }}>
            {filtered.length} image{filtered.length!==1?'s':''}
            {filtered.length === 0 && allImages.length > 0 ? ' — try a different filter' : ''}
          </div>

          {/* Grid */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {allImages.length === 0 && (
              <div style={{ textAlign:'center', padding:30, color:'var(--mut)', fontSize:12 }}>
                No images uploaded yet. Add images to items, characters, or locations first.
              </div>
            )}
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 }}>
              {filtered.map((img, i) => (
                <div key={`${img.entryId}-${i}`}
                  style={{ background:'var(--card)', border:'1px solid var(--brd)',
                    borderRadius:8, overflow:'hidden', cursor:'pointer',
                    transition:'border-color .15s' }}
                  onClick={() => onPick(img.url)}>
                  <div style={{ position:'relative' }}>
                    <img src={img.url} alt={img.name}
                      style={{ width:'100%', height:90, objectFit:'cover', display:'block' }}
                      onError={e => e.target.style.display='none'} />
                    <button
                      onClick={e => { e.stopPropagation(); setLightbox(img.url) }}
                      style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,.6)',
                        border:'none', color:'#fff', borderRadius:4, fontSize:10,
                        cursor:'pointer', padding:'2px 5px' }}>⤢</button>
                  </div>
                  <div style={{ padding:'5px 7px' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--tx)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {img.name}
                    </div>
                    <div style={{ fontSize:9, color:'var(--ci)' }}>{img.catLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop:12, fontSize:10, color:'var(--mut)',
            borderTop:'1px solid var(--brd)', paddingTop:10 }}>
            Click an image to use it · ⤢ to preview full size
          </div>
        </div>
      </div>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  )
}
