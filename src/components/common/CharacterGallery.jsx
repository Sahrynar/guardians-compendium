import { useState } from 'react'

// Locked Compendium rainbow — always in spectrum order
export const RAINBOW = ['#ff69b4','#ff7f6e','#ff3b3b','#ff5a2b','#ff7f27','#ffb52e','#ffe135','#b6e34b',
  '#4cd964','#2fd6b0','#28d5e8','#4aa8ff','#2f6bff','#5a4fff','#8a5cff','#a64cf5','#e04cf0','#ff4fd8']

const SIZE_W = { S: 86, M: 128, L: 186 }
const NEXT_SIZE = { S: 'M', M: 'L', L: 'S' }

// Unified image list for a character. The Portrait slot is always derived live
// from the PortraitTool's canvas (edit via 🎨, never deleted here). Legacy
// reference_image is shown until the first gallery change migrates ch.images.
export function getCharImages(ch) {
  const out = []
  const pUrl = ch.portrait_canvas || ch.portrait_custom
  if (pUrl) out.push({ id: 'p0', kind: 'portrait', url: pUrl, label: 'Portrait', size: 'M' })
  if (Array.isArray(ch.images)) {
    for (const im of ch.images) if (im && im.url && im.kind !== 'portrait') out.push(im)
  } else if (ch.reference_image) {
    out.push({ id: 'ref0', url: ch.reference_image, label: 'Reference', size: 'M' })
  }
  return out
}

export default function CharacterGallery({ images, onChange, onOpen, onPortrait }) {
  const [editingId, setEditingId] = useState(null)
  const [labelDraft, setLabelDraft] = useState('')

  function commit(next) { onChange(next.filter(im => im.kind !== 'portrait')) }
  function addImage(url) {
    const label = window.prompt('Label for this image (e.g. "Age 12", "Her sword"):', '') || 'Untitled'
    commit([...images, { id: 'img_' + Date.now(), url, label, size: 'M' }])
  }
  function fromFile(ev) {
    const f = ev.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = e2 => addImage(e2.target.result)
    r.readAsDataURL(f)
    ev.target.value = ''
  }
  function fromLibrary() {
    window.dispatchEvent(new CustomEvent('gcomp_pick_library', { detail: { onPick: src => addImage(src) } }))
  }
  function remove(im) {
    if (!window.confirm(`Remove "${im.label || 'this image'}"? (The image stays in your Library / original source.)`)) return
    commit(images.filter(x => x.id !== im.id))
  }
  function cycleSize(im) {
    commit(images.map(x => x.id === im.id ? { ...x, size: NEXT_SIZE[x.size || 'M'] } : x))
  }
  function startLabel(im) { setEditingId(im.id); setLabelDraft(im.label || '') }
  function saveLabel(im) {
    commit(images.map(x => x.id === im.id ? { ...x, label: labelDraft.trim() || 'Untitled' } : x))
    setEditingId(null)
  }

  const tiny = { fontSize: '0.6em', padding: '1px 5px', borderRadius: 5, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
      {images.map((im, idx) => {
        const c = RAINBOW[idx % RAINBOW.length]
        const w = SIZE_W[im.size || 'M']
        const isP = im.kind === 'portrait'
        return (
          <div key={im.id} style={{ width: w, background: '#0b0b0e', border: `1px solid ${c}`, borderRadius: 8, padding: 5, textAlign: 'center' }}>
            <img src={im.url} alt={im.label || ''} loading="lazy"
              style={{ width: '100%', height: Math.round(w * 1.22), objectFit: 'cover', borderRadius: 5, cursor: 'zoom-in', display: 'block' }}
              onClick={() => onOpen(im)} />
            {editingId === im.id ? (
              <input autoFocus value={labelDraft} onChange={e => setLabelDraft(e.target.value)}
                onBlur={() => saveLabel(im)} onKeyDown={e => { if (e.key === 'Enter') saveLabel(im); if (e.key === 'Escape') setEditingId(null) }}
                style={{ width: '100%', marginTop: 4, fontSize: '0.68em', background: '#060608', color: 'var(--tx)', border: `1px solid ${c}`, borderRadius: 4, padding: '2px 4px', textAlign: 'center' }} />
            ) : (
              <div style={{ fontSize: '0.68em', color: c, marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={im.label}>{im.label || 'Untitled'}</div>
            )}
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <button style={tiny} title="Cycle size S → M → L" onClick={() => cycleSize(im)}>{im.size || 'M'}</button>
              {isP ? (
                <button style={tiny} title="Edit portrait" onClick={onPortrait}>🎨</button>
              ) : (
                <>
                  <button style={tiny} title="Rename label" onClick={() => startLabel(im)}>✎</button>
                  <button style={{ ...tiny, color: '#ff3355', borderColor: '#ff3355' }} title="Remove from this character" onClick={() => remove(im)}>✕</button>
                </>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ width: 86, minHeight: 120, border: `1.5px dashed ${RAINBOW[images.length % RAINBOW.length]}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--mut)', fontSize: '0.66em', padding: 6 }}>
        <div style={{ fontSize: '1.6em', lineHeight: 1 }}>+</div>
        <label style={{ cursor: 'pointer', color: 'var(--dim)' }}>📎 Upload
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={fromFile} />
        </label>
        <span style={{ cursor: 'pointer', color: 'var(--dim)' }} onClick={fromLibrary}>🖼 Library</span>
        {!images.some(i => i.kind === 'portrait') && (
          <span style={{ cursor: 'pointer', color: 'var(--dim)' }} onClick={onPortrait}>🎨 Portrait</span>
        )}
      </div>
    </div>
  )
}
