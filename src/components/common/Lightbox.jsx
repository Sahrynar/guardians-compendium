// Shared lightbox component — click any image to expand full screen
export default function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.95)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <button
        onClick={onClose}
        style={{ position:'absolute', top:16, right:20, background:'none', border:'none',
          color:'#fff', fontSize:28, cursor:'pointer', lineHeight:1 }}>✕</button>
      <img
        src={src} alt=""
        style={{ maxWidth:'100%', maxHeight:'90vh', objectFit:'contain',
          borderRadius:8, boxShadow:'0 0 60px rgba(0,0,0,.8)' }}
        onClick={e => e.stopPropagation()} />
    </div>
  )
}
