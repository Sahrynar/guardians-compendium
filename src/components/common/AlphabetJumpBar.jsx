import { useMemo } from 'react'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function AlphabetJumpBar({ entries, getName, onJump, color = 'var(--cc)' }) {
  const available = useMemo(() => {
    const set = new Set()
    entries.forEach(e => {
      const name = (getName(e) || '').trim()
      if (!name) return
      const letter = name[0].toUpperCase()
      if (LETTERS.includes(letter)) set.add(letter)
    })
    return set
  }, [entries, getName])

  function jumpTo(letter) {
    const target = entries.find(e => {
      const name = (getName(e) || '').trim()
      return name[0]?.toUpperCase() === letter
    })
    if (target) onJump(target)
  }

  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', padding: '6px 8px', background: 'var(--card)', borderRadius: 6, border: '1px solid var(--brd)', marginBottom: 8, position: 'sticky', top: 0, zIndex: 10 }}>
      {LETTERS.map(L => {
        const has = available.has(L)
        return (
          <button
            key={L}
            onClick={() => has && jumpTo(L)}
            disabled={!has}
            style={{ fontSize: '0.77em', padding: '2px 7px', minWidth: 22, borderRadius: 4, border: 'none', background: 'none', color: has ? color : 'var(--mut)', cursor: has ? 'pointer' : 'default', opacity: has ? 1 : 0.3, fontWeight: has ? 700 : 400 }}
          >
            {L}
          </button>
        )
      })}
    </div>
  )
}
