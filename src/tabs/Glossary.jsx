import { useEffect, useMemo, useState } from 'react'
import FilterPopup from '../components/common/FilterPopup'
import AlphabetJumpBar from '../components/common/AlphabetJumpBar'
import { TAB_RAINBOW } from '../constants'
import { scrollAndFlashEntry } from '../components/common/entryNav'

import { GLOSSARY_CATS } from '../constants'
const tabColor = TAB_RAINBOW['glossary'] || '#aaaaaa'

export default function Glossary({ db, goTo, goToWiki, navSearch }) {
  const [search, setSearch] = useState(navSearch || '')
  const [filterValues, setFilterValues] = useState({})
  const [autoOnly, setAutoOnly] = useState(false)
  const [size, setSize] = useState('M')
  const [termModal, setTermModal] = useState(null) // {} for new, entry for edit
  const SIZES = { XS: 0.72, S: 0.85, M: 1, L: 1.15, XL: 1.31 }
  const WIDTHS = { XS: 560, S: 720, M: 920, L: 1140, XL: 4000 }

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
    <div style={{ fontSize: SIZES[size] + 'em', maxWidth: WIDTHS[size] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.15em', color: tabColor }}>📚 Glossary</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.77em', color: 'var(--mut)' }}>{filtered.length} term{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={() => goTo('wiki')} style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 8, background: 'none', border: '1px solid var(--brd)', color: 'var(--dim)', cursor: 'pointer' }}>→ Full Wiki</button>
          <button onClick={() => setTermModal({})} style={{ fontSize: '0.77em', padding: '3px 10px', borderRadius: 8, background: 'none', border: '1px solid var(--cca)', color: 'var(--cca)', cursor: 'pointer' }}>+ Term</button>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {Object.keys(SIZES).map(s => (
              <button key={s} onClick={() => setSize(s)} style={{ fontSize: '0.66em', padding: '2px 6px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${size === s ? 'var(--cca)' : 'var(--brd)'}`, background: size === s ? 'rgba(255,170,51,.15)' : 'none', color: size === s ? 'var(--cca)' : 'var(--mut)' }}>{s}</button>
            ))}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
        <FilterPopup color={tabColor} filters={[{ key: 'category', label: 'Category', options: availableCats.map(c => ({ value: c, label: c })) }]} values={filterValues} onChange={(key, vals) => setFilterValues(prev => ({ ...prev, [key]: vals }))} />
      </div>

      <div style={{ position: 'sticky', top: 'var(--nav-h, 56px)', zIndex: 30, background: 'var(--bg)', padding: '6px 0' }}>
        <AlphabetJumpBar entries={filtered} getName={e => e.term || e.title} onJump={target => scrollAndFlashEntry(target.id)} color={tabColor} />
      </div>

      {articles.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <p>No Wiki entries yet.</p>
          <button className="btn btn-primary" style={{ background: tabColor, marginTop: 8 }} onClick={() => goTo('wiki')}>→ Go to Wiki</button>
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
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.54em', fontWeight: 700, color: tabColor, borderBottom: `1px solid ${tabColor}33`, paddingBottom: 4, marginBottom: 8, letterSpacing: '.1em' }}>{letter}</div>
          {grouped[letter].map(entry => (
            <div key={entry.id} id={`gcomp-entry-${entry.id}`} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }} onClick={() => goToWiki ? goToWiki(entry) : goTo('wiki')}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1em', fontWeight: 700, color: 'var(--tx)' }}>{entry.title}</span>
                  <span style={{ fontSize: '0.69em', color: tabColor, textTransform: 'uppercase', letterSpacing: '.06em', opacity: 0.7 }}>{entry.category}</span>
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

      {termModal && (() => {
        const existing = termModal.id ? termModal : null
        return <TermModal db={db} existing={existing} glossaryEntries={glossaryEntries} onClose={() => setTermModal(null)} />
      })()}
    </div>
  )
}


function TermModal({ db, existing, glossaryEntries, onClose }) {
  const [pickId, setPickId] = useState(existing?.id || '')
  const base = pickId ? glossaryEntries.find(x => x.id === pickId) : null
  const [title, setTitle] = useState(base?.title || '')
  const [summary, setSummary] = useState(base?.summary || '')
  const [category, setCategory] = useState(base?.category || GLOSSARY_CATS[0])
  useEffect(() => { if (base) { setTitle(base.title || ''); setSummary(base.summary || ''); setCategory(base.category || GLOSSARY_CATS[0]) } }, [pickId])
  function save() {
    if (!title.trim()) return
    const now = new Date().toISOString()
    db.upsertEntry('wiki', {
      ...(base || {}), id: base?.id || 'gl_' + Date.now(), title: title.trim(), summary,
      category, is_glossary: true, blocks: base?.blocks || [],
      status: base?.status || 'provisional', created: base?.created || now, updated: now,
    })
    onClose()
  }
  const inp = { width: '100%', boxSizing: 'border-box', fontSize: '0.85em', padding: '5px 8px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', marginBottom: 8 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 12, padding: 18, width: '100%', maxWidth: 420 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: tabColor, marginBottom: 10 }}>✎ {base ? 'Edit' : 'Add'} Glossary Term</div>
        <label style={{ fontSize: '0.72em', color: 'var(--mut)' }}>Edit existing (optional)</label>
        <select value={pickId} onChange={e => setPickId(e.target.value)} style={inp}>
          <option value="">— new term —</option>
          {glossaryEntries.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <label style={{ fontSize: '0.72em', color: 'var(--mut)' }}>Term</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
        <label style={{ fontSize: '0.72em', color: 'var(--mut)' }}>Definition / summary</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
        <label style={{ fontSize: '0.72em', color: 'var(--mut)' }}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
          {GLOSSARY_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-sm btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--cca)', color: '#000' }} onClick={save}>Save</button>
        </div>
        <div style={{ fontSize: '0.63em', color: 'var(--mut)', marginTop: 8 }}>Saves as a wiki entry flagged is_glossary — appears in both Glossary and Wiki.</div>
      </div>
    </div>
  )
}
