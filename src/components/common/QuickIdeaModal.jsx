import { useEffect, useState } from 'react'
import Modal from './Modal'
import { uid } from '../../constants'
import { IDEAS_CATEGORIES } from '../../tabs/notes/stickyShared'

export default function QuickIdeaModal({ open, onClose, db, color = '#fff' }) {
  const [ideaInput, setIdeaInput] = useState('')
  const [ideaCat, setIdeaCat] = useState(IDEAS_CATEGORIES[0]?.id || 'names')

  useEffect(() => {
    if (!open) {
      setIdeaInput('')
      setIdeaCat(IDEAS_CATEGORIES[0]?.id || 'names')
    }
  }, [open])

  function saveIdea() {
    const value = ideaInput.trim()
    if (!value) return
    db.upsertEntry('ideas_list', {
      id: uid(),
      category: ideaCat,
      value,
      created_at: new Date().toISOString(),
    })
    onClose?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add an idea" color={color} maxWidth={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          autoFocus
          value={ideaInput}
          onChange={e => setIdeaInput(e.target.value)}
          placeholder="Idea text..."
        />
        <select value={ideaCat} onChange={e => setIdeaCat(e.target.value)}>
          {IDEAS_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: color, color: '#000' }} onClick={saveIdea}>Save</button>
        </div>
      </div>
    </Modal>
  )
}
