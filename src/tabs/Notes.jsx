import { useEffect, useState } from 'react'
import { TAB_RAINBOW } from '../constants'
import StickiesView from './notes/StickiesView'
import JournalView from './notes/JournalView'
import IdeasView from './notes/IdeasView'

const NOTES_COLOR = TAB_RAINBOW.notes

export default function Notes(props) {
  const { db } = props
  const [pendingExpandId, setPendingExpandId] = useState(null)
  const [subTab, setSubTab] = useState(() => {
    try { return localStorage.getItem('notes_subtab') || 'stickies' } catch { return 'stickies' }
  })

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const note = (db.db.notes || []).find(x => x.id === targetId)
      if (note) {
        pick('journal')
        setPendingExpandId(targetId)
        return
      }
      const sticky = (db.db.journal_captures || []).find(x => x.id === targetId)
      if (sticky) {
        pick('stickies')
        setPendingExpandId(targetId)
        return
      }
      const idea = (db.db.ideas_list || []).find(x => x.id === targetId)
      if (idea) {
        pick('ideas')
        setPendingExpandId(targetId)
      }
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [db.db.notes, db.db.journal_captures])

  function pick(t) {
    setSubTab(t)
    try { localStorage.setItem('notes_subtab', t) } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['stickies', '📌 Stickies'], ['journal', '📝 Journal'], ['ideas', '💡 Ideas']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => pick(k)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${subTab === k ? NOTES_COLOR : 'var(--brd)'}`,
              background: subTab === k ? NOTES_COLOR : 'transparent',
              color: subTab === k ? '#000' : NOTES_COLOR,
              fontSize: '0.85em',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {subTab === 'stickies' && <StickiesView {...props} goToSubTab={pick} pendingExpandId={pendingExpandId} clearPendingExpandId={() => setPendingExpandId(null)} />}
      {subTab === 'journal' && <JournalView {...props} pendingExpandId={pendingExpandId} clearPendingExpandId={() => setPendingExpandId(null)} />}
      {subTab === 'ideas' && <IdeasView {...props} pendingExpandId={pendingExpandId} clearPendingExpandId={() => setPendingExpandId(null)} />}
    </div>
  )
}
