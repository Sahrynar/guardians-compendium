import { useEffect, useMemo, useState } from 'react'

const IMG_RE = /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i
function looksLikeImage(v) { return typeof v === 'string' && (v.startsWith('data:image') || ((v.startsWith('http') || v.startsWith('/')) && (IMG_RE.test(v) || v.includes('supabase.co/storage')))) }

// Reusable "choose from Image Library" modal. onPick(src) → your field.
export default function LibraryPicker({ db, onPick, onClose }) {
  const [q, setQ] = useState('')
  const gallery = useMemo(() => {
    const seen = new Set(); const out = []
    Object.entries(db.db || {}).forEach(([cat, entries]) => {
      if (!Array.isArray(entries)) return
      entries.forEach(e => {
        if (!e || typeof e !== 'object') return
        Object.entries(e).forEach(([field, v]) => {
          if (!looksLikeImage(v)) return
          const key = v.slice(0, 120) + '|' + e.id
          if (seen.has(key)) return
          seen.add(key)
          out.push({ src: v, cat, label: e.title || e.display_name || e.name || e.id })
        })
      })
    })
    return out
  }, [db.db])
  const shown = gallery.filter(g => !q || (g.label + ' ' + g.cat).toLowerCase().includes(q.toLowerCase()))
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 12, padding: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: 'var(--ci)' }}>🖼 Choose from Image Library</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: '1.08em' }}>✕</button>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…"
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, fontSize: '0.85em', padding: '5px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {shown.map((g, i) => (
            <div key={i} onClick={() => { onPick(g.src); onClose() }} style={{ cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, overflow: 'hidden' }}>
              <img src={g.src} alt={g.label} style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }} loading="lazy" />
              <div style={{ fontSize: '0.6em', color: 'var(--dim)', padding: '2px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</div>
            </div>
          ))}
        </div>
        {shown.length === 0 && <div style={{ fontSize: '0.77em', color: 'var(--mut)' }}>No images match.</div>}
      </div>
    </div>
  )
}


// Mount ONCE at App level. Any component can open the picker via:
//   window.dispatchEvent(new CustomEvent('gcomp_pick_library', { detail: { onPick: src => ... } }))
export function LibraryPickerHost({ db }) {
  const [req, setReq] = useState(null)
  useEffect(() => {
    const h = e => setReq({ onPick: e.detail?.onPick })
    window.addEventListener('gcomp_pick_library', h)
    return () => window.removeEventListener('gcomp_pick_library', h)
  }, [])
  if (!req) return null
  return <LibraryPicker db={db} onPick={src => { try { req.onPick?.(src) } catch {} }} onClose={() => setReq(null)} />
}
