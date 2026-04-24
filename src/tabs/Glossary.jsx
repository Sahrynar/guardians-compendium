import { useEffect, useMemo, useState } from 'react'
import FilterPopup from '../components/common/FilterPopup'
import AlphabetJumpBar from '../components/common/AlphabetJumpBar'
import { scrollAndFlashEntry } from '../components/common/entryNav'

const GLOSSARY_CATS = ['Languages', 'Lore', 'Cosmology', 'Power System', 'Cultures', 'Religions', 'Factions', 'Geography']

export default function Glossary({ db, goTo, goToWiki, navSearch }) {
  const [search, setSearch] = useState(navSearch || '')
  const [filterValues, setFilterValues] = useState({})
  const [autoOnly, setAutoOnly] = useState(false)

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  const articles = db.db.wiki || []
  const glossaryEntries = useMemo(() => (
    articles
      .filter(a => GLOSSARY_CATS.includes(a.category) || a.is_glossary)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  ), [articles])

  const autoCount = glossaryEntries.filter(a => a.auto_imported === true).length
  const availableCats = useMemo(() => {
    const cats = new Set(glossaryEntries.map(a => a.category).filter(Boolean))
    return GLOSSARY_CATS.filter(c => cats.has(c))
  }, [glossaryEntries])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = glossaryEntries.find(x => x.id === targetId)
      if (!entry) return
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [glossaryEntries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const selectedCats = filterValues.category || []
    return glossaryEntries.filter(a => {
      const mc = selectedCats.length === 0 || selectedCats.includes(a.category)
      const mq = !q || (a.title || '').toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q)
      const ma = !autoOnly || a.auto_imported === true
      return mc && mq && ma
    })
  }, [glossaryEntries, search, filterValues, autoOnly])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: '#ff6b6b' }}>📚 Glossary</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>{filtered.length} term{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={() => goTo('wiki')} style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 8, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>→ Full Wiki</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <input className="sx" placeholder="Search terms..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
        <FilterPopup color="#ff6b6b" filters={[{ key: 'category', label: 'Category', options: availableCats.map(c => ({ value: c, label: c })) }]} values={filterValues} onChange={(key, vals) => setFilterValues(prev => ({ ...prev, [key]: vals }))} />
      </div>

      <AlphabetJumpBar entries={filtered} getName={e => e.term || e.title} onJump={target => scrollAndFlashEntry(target.id)} color="#ff6b6b" />

      {articles.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <p>No Wiki entries yet.</p>
          <button className="btn btn-primary" style={{ background: '#ff6b6b', marginTop: 8 }} onClick={() => goTo('wiki')}>→ Go to Wiki</button>
        </div>
      )}

      {articles.length > 0 && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>No terms match your search.</p>
        </div>
      )}

      {letters.map(letter => (
        <div key={letter} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.54em', fontWeight: 700, color: '#ff6b6b', borderBottom: '1px solid rgba(201,102,255,.2)', paddingBottom: 4, marginBottom: 8, letterSpacing: '.1em' }}>{letter}</div>
          {grouped[letter].map(entry => (
            <div key={entry.id} id={`gcomp-entry-${entry.id}`} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }} onClick={() => goToWiki ? goToWiki(entry) : goTo('wiki')}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', fontWeight: 700, color: 'var(--tx)' }}>{entry.title}</span>
                  <span style={{ fontSize: '0.69em', color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '.06em', opacity: 0.7 }}>{entry.category}</span>
                  {entry.auto_imported && <span style={{ fontSize: '0.69em', color: '#ffcc00' }}>📥</span>}
                </div>
                {entry.summary && <div style={{ fontSize: '0.92em', color: 'var(--dim)', marginTop: 3, lineHeight: 1.5 }}>{entry.summary}</div>}
                {!entry.summary && entry.blocks?.length > 0 && (() => {
                  const firstText = entry.blocks.find(b => b.type === 'text')
                  if (!firstText?.content) return null
                  const preview = firstText.content.slice(0, 160)
                  return <div style={{ fontSize: '0.85em', color: 'var(--mut)', marginTop: 3, lineHeight: 1.5, fontStyle: 'italic' }}>{preview}{firstText.content.length > 160 ? '…' : ''}</div>
                })()}
              </div>
              <div style={{ flexShrink: 0, fontSize: '0.77em', color: 'var(--mut)', paddingTop: 3 }}>{(entry.blocks?.length || 0) > 0 && `${entry.blocks.length} block${entry.blocks.length !== 1 ? 's' : ''}`}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
