import { useEffect, useState, useRef } from 'react'

// ── Cloud error toast (PATCH7H) ──────────────────────────────────
// useDB dispatches window 'gol-cloud-error' events when a Supabase
// load/save/delete fails. Previously these only went to the browser
// console — invisible in normal use. This shows a dismissible banner.
export default function CloudErrorToast() {
  const [msg, setMsg] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    function onErr(e) {
      setMsg(e.detail || 'Cloud sync error')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setMsg(''), 8000)
    }
    window.addEventListener('gol-cloud-error', onErr)
    return () => {
      window.removeEventListener('gol-cloud-error', onErr)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!msg) return null
  return (
    <div
      role="alert"
      onClick={() => setMsg('')}
      title="Click to dismiss"
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        maxWidth: 360, padding: '10px 14px', cursor: 'pointer',
        background: '#2a1215', border: '1px solid #ff4433',
        borderRadius: 'var(--r)', color: '#ffb0a8',
        fontSize: '0.85em', lineHeight: 1.4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      ⚠ {msg}
    </div>
  )
}
