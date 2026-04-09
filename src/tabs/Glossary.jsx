import { useState, useMemo } from 'react'

// Categories that are glossary-relevant by default
const GLOSSARY_CATS = ['Languages', 'Lore', 'Cosmology', 'Power System', 'Cultures', 'Religions', 'Factions', 'Geography']

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

export default function Glossary({ db, goTo, goToWiki }) {
  const [search, setSearch] = useState('')
  const [jumpLetter, setJumpLetter] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  const articles = db.db.wiki || []

  // Glossary = Wiki entries in glossary-relevant categories OR flagged as glossary
  const glossaryEntries = useMemo(() => {
    return articles
      .filter(a => GLOSSARY_CATS.includes(a.category) || a.is_glossary)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }, [articles])

  const availableCats = useMemo(() => {
    const cats = new Set(glossaryEntries.map(a => a.category).filter(Boolean))
    return ['all', ...GLOSSARY_CATS.filter(c => cats.has(c))]
  }, [glossaryEntries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return glossaryEntries.filter(a => {
      const mc = filterCat === 'all' || a.category === filterCat
      const mq = !q || (a.title || '').toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q)
      const ml = !jumpLetter || (jumpLetter === '#'
        ? !/^[a-z]/i.test(a.title || '')
        : (a.title || '').toUpperCase().startsWith(jumpLetter))
      return mc && mq && ml
    })
  }, [glossaryEntries, search, filterCat, jumpLetter])

  // Group by first letter for dictionary display
  const grouped = useMemo(() => {
    const g = {}
    filtered.forEach(a => {
      const l = /^[a-z]/i.test(a.title || '') ? (a.title[0] || '#').toUpperCase() : '#'
      if (!g[l]) g[l] = []
      g[l].push(a)
    })
    return g
  }, [filtered])

  const letters = Object.keys(grouped).sort()

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: '#ff6b6b' }}>
          📚 Glossary
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>
            {filtered.length} term{filtered.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => goTo('wiki')}
            style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 8, background: 'none',
              border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>
            → Full Wiki
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <input className="sx" placeholder="Search terms…" value={search}
          onChange={e => { setSearch(e.target.value); setJumpLetter(null) }}
          style={{ flex: 1, minWidth: 180 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {availableCats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                background: filterCat === c ? '#ff6b6b' : 'none',
                color: filterCat === c ? '#000' : 'var(--dim)',
                border: `1px solid ${filterCat === c ? '#ff6b6b' : 'var(--brd)'}` }}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Alpha jump bar */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 12 }}>
        {ALPHA.map(l => {
          const hasEntries = grouped[l]?.length > 0
          return (
            <button key={l} onClick={() => setJumpLetter(jumpLetter === l ? null : l)}
              disabled={!hasEntries}
              style={{ fontSize: '0.77em', padding: '2px 6px', borderRadius: 4, cursor: hasEntries ? 'pointer' : 'default',
                fontFamily: "'Cinzel',serif", fontWeight: 600,
                background: jumpLetter === l ? '#ff6b6b' : 'none',
                color: jumpLetter === l ? '#000' : hasEntries ? '#ff6b6b' : 'var(--brd)',
                border: `1px solid ${jumpLetter === l ? '#ff6b6b' : hasEntries ? 'rgba(201,102,255,.3)' : 'transparent'}` }}>
              {l}
            </button>
          )
        })}
      </div>

      {/* No entries state */}
      {articles.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <p>No Wiki entries yet.</p>
          <p style={{ fontSize: '0.85em', color: 'var(--mut)', marginTop: 4 }}>
            The Glossary pulls from Wiki entries in the Lore, Languages, Cosmology,
            Power System, Cultures, Religions, and Factions categories.
          </p>
          <button className="btn btn-primary" style={{ background: '#ff6b6b', marginTop: 8 }}
            onClick={() => goToWiki ? goToWiki(entry) : goTo('wiki')}>
            → Go to Wiki
          </button>
        </div>
      )}

      {articles.length > 0 && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>No terms match your search.</p>
        </div>
      )}

      {/* Dictionary display — grouped by letter */}
      {letters.map(letter => (
        <div key={letter} style={{ marginBottom: 20 }}>
          {/* Letter header */}
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.54em', fontWeight: 700,
            color: '#ff6b6b', borderBottom: '1px solid rgba(201,102,255,.2)',
            paddingBottom: 4, marginBottom: 8, letterSpacing: '.1em' }}>
            {letter}
          </div>

          {grouped[letter].map(entry => (
            <div key={entry.id}
              style={{ display: 'flex', gap: 12, padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,.04)',
                cursor: 'pointer' }}
              onClick={() => goToWiki ? goToWiki(entry) : goTo('wiki')}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1em',
                    fontWeight: 700, color: 'var(--tx)' }}>{entry.title}</span>
                  <span style={{ fontSize: '0.69em', color: '#ff6b6b', textTransform: 'uppercase',
                    letterSpacing: '.06em', opacity: 0.7 }}>{entry.category}</span>
                </div>
                {entry.summary && (
                  <div style={{ fontSize: '0.92em', color: 'var(--dim)', marginTop: 3, lineHeight: 1.5 }}>
                    {entry.summary}
                  </div>
                )}
                {/* Show first text block content if short enough */}
                {!entry.summary && entry.blocks?.length > 0 && (() => {
                  const firstText = entry.blocks.find(b => b.type === 'text')
                  if (!firstText?.content) return null
                  const preview = firstText.content.slice(0, 160)
                  return (
                    <div style={{ fontSize: '0.85em', color: 'var(--mut)', marginTop: 3,
                      lineHeight: 1.5, fontStyle: 'italic' }}>
                      {preview}{firstText.content.length > 160 ? '…' : ''}
                    </div>
                  )
                })()}
              </div>
              <div style={{ flexShrink: 0, fontSize: '0.77em', color: 'var(--mut)', paddingTop: 3 }}>
                {(entry.blocks?.length || 0) > 0 && `${entry.blocks.length} block${entry.blocks.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Footer note */}
      {articles.length > 0 && (
        <div style={{ marginTop: 16, padding: '8px 12px', background: 'var(--card)',
          border: '1px solid var(--brd)', borderRadius: 6, fontSize: '0.77em', color: 'var(--mut)',
          lineHeight: 1.6 }}>
          💡 Glossary shows Wiki entries in Lore, Languages, Cosmology, Power System, Cultures, Religions, and Factions categories.
          To add a term, create a Wiki entry in one of those categories. Full entries open in the Wiki tab.
        </div>
      )}
    </div>
  )
}
