import { useEffect, useMemo, useState } from 'react'
import { TAB_RAINBOW, uid } from '../../constants'
import { IDEAS_CATEGORIES, IDEAS_LS_KEY, lsGet, lsSet } from './stickyShared'

const NOTES_COLOR = TAB_RAINBOW.notes
const COLS_MAP = { XS: 5, S: 4, M: 3, L: 2, XL: 1 }
const CAT_COLORS = { names: '#ff6b6b', words: '#44aaff', phrases: '#44bb44' }

export default function IdeasView({ db, pendingExpandId, clearPendingExpandId }) {
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('newest')
  const [catFilter, setCatFilter] = useState('all')
  const [draftValue, setDraftValue] = useState('')
  const [draftCategory, setDraftCategory] = useState('names')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [cols, setCols] = useState(() => {
    try { return localStorage.getItem('ideas_list_cols') || 'M' } catch { return 'M' }
  })
  const ideas = db.db.ideas_list || lsGet(IDEAS_LS_KEY, [])

  useEffect(() => { lsSet(IDEAS_LS_KEY, ideas) }, [ideas])

  useEffect(() => {
    if (!pendingExpandId) return
    const found = ideas.find(i => i.id === pendingExpandId)
    if (!found) return
    setEditingId(found.id)
    setEditValue(found.value || '')
    clearPendingExpandId?.()
  }, [pendingExpandId, ideas, clearPendingExpandId])

  function setColsPersist(v) {
    setCols(v)
    try { localStorage.setItem('ideas_list_cols', v) } catch {}
  }

  async function addIdea() {
    const value = draftValue.trim()
    if (!value) return
    const entry = { id: uid(), category: draftCategory, value, created_at: new Date().toISOString() }
    db.upsertEntry('ideas_list', entry)
    setDraftValue('')
  }

  async function saveIdea(id) {
    const value = editValue.trim()
    if (!value) return
    const entry = ideas.find(i => i.id === id)
    if (!entry) return
    const updated = { ...entry, value }
    db.upsertEntry('ideas_list', updated)
    setEditingId(null)
  }

  async function deleteIdea(id) {
    db.deleteEntry('ideas_list', id)
  }

  const filtered = useMemo(() => {
    const list = ideas.filter(i => {
      const matchSearch = !search || (i.value || '').toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === 'all' || i.category === catFilter
      return matchSearch && matchCat
    })
    list.sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sortMode === 'alpha') return (a.value || '').localeCompare(b.value || '')
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
    return list
  }, [ideas, search, catFilter, sortMode])

  return (
    <div>
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {['XS', 'S', 'M', 'L', 'XL'].map(l => (
            <button key={l} onClick={() => setColsPersist(l)} style={{ fontSize: '0.77em', padding: '2px 7px', borderRadius: 4, border: `1px solid ${cols === l ? NOTES_COLOR : 'var(--brd)'}`, background: cols === l ? `${NOTES_COLOR}22` : 'transparent', color: cols === l ? NOTES_COLOR : 'var(--dim)', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <input className="sx" placeholder="Search ideas..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={sortMode} onChange={e => setSortMode(e.target.value)} style={{ fontSize: '0.85em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="alpha">A-Z</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ fontSize: '0.85em', padding: '4px 8px', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
          <option value="all">All</option>
          {IDEAS_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select value={draftCategory} onChange={e => setDraftCategory(e.target.value)} style={{ minWidth: 120, padding: '6px 8px', fontSize: '0.85em', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }}>
            {IDEAS_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
          </select>
          <input value={draftValue} onChange={e => setDraftValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIdea()} placeholder="Add a new idea..." style={{ flex: 1, minWidth: 220, padding: '6px 8px', fontSize: '0.92em', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)' }} />
          <button onClick={addIdea} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${NOTES_COLOR}`, background: 'transparent', color: NOTES_COLOR, fontSize: '0.85em', cursor: 'pointer' }}>+ Add</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS_MAP[cols] || 3}, 1fr)`, gap: 8 }}>
        {filtered.map(idea => {
          const color = CAT_COLORS[idea.category] || NOTES_COLOR
          const editing = editingId === idea.id
          return (
            <div key={idea.id} id={`gcomp-entry-${idea.id}`} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.69em', padding: '2px 6px', borderRadius: 999, background: `${color}22`, color, border: `1px solid ${color}55` }}>
                  {IDEAS_CATEGORIES.find(c => c.id === idea.category)?.label || idea.category}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditingId(idea.id); setEditValue(idea.value || '') }} style={{ fontSize: '0.85em', border: 'none', background: 'none', color, cursor: 'pointer' }}>✎</button>
                  <button onClick={() => deleteIdea(idea.id)} style={{ fontSize: '0.85em', border: 'none', background: 'none', color: '#ff3355', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              {editing ? (
                <div style={{ marginTop: 8 }}>
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', minHeight: 90, padding: '6px 8px', fontSize: '0.92em', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 6, color: 'var(--tx)', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => saveIdea(idea.id)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${color}`, background: 'transparent', color, fontSize: '0.85em', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--brd)', background: 'transparent', color: 'var(--dim)', fontSize: '0.85em', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 8, fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{idea.value}</div>
                  <div style={{ marginTop: 8, fontSize: '0.69em', color: 'var(--mut)' }}>{idea.created_at ? new Date(idea.created_at).toLocaleString() : ''}</div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
