import { useEffect } from 'react'

export default function Modal({ open, onClose, title, color = 'var(--cc)', children, maxWidth = 580, noBackdrop = false }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay open"
      onClick={noBackdrop ? undefined : (e => { if (e.target === e.currentTarget) onClose() })}
    >
      <div className="modal-box" style={{ maxWidth }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {title && (
          <h2 className="modal-title" style={{ color }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}

export function ModalActions({ children }) {
  return <div className="modal-actions">{children}</div>
}
