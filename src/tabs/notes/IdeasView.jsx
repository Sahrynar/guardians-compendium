import { useEffect, useMemo, useState } from 'react'
import { TAB_RAINBOW, uid } from '../../constants'
import { IDEAS_CATEGORIES, IDEAS_LS_KEY, lsGet, lsSet } from './stickyShared'

const NOTES_COLOR = TAB_RAINBOW.notes
const CAT_COLORS = { names: '#ff6b6b', words: '#44aaff', phrases: '#44bb44' }

export default function IdeasView({ db, pendingExpandId, clearPendingExpandId }) {
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('newest')
  const [catFilter, setCatFilter] = useState('all')
  const [draftValue, setDraftValue] = useState('')
  const [draftCategory, setDraftCategory] = useState('names')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
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
    db.upsertEntry('ideas_list', { ...entry, value })
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

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${IDEAS_CATEGORIES.length}, 1fr)`, gap: 12, alignItems: 'flex-start' }}>
        {IDEAS_CATEGORIES.map(cat => {
          const items = filtered.filter(i => i.category === cat.id)
          const color = CAT_COLORS[cat.id] || NOTES_COLOR
          return (
            <div key={cat.id} style={{ background: 'var(--card)', border: '1px solid var(--brd)', borderTop: `3px solid ${color}`, borderRadius: 8, padding: 10, minHeight: 200 }}>
              <div style={{ fontFamily: "'Cinzel', serif", color, marginBottom: 8, fontSize: '1em', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>{cat.label}</span>
                <span style={{ fontSize: '0.69em', color: 'var(--mut)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 600, overflowY: 'auto' }}>
                {items.length === 0 && (
                  <div style={{ fontSize: '0.77em', color: 'var(--mut)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                    No {cat.label.toLowerCase()} yet
                  </div>
                )}
                {items.map(idea => {
                  const editing = editingId === idea.id
                  return (
                    <div key={idea.id} id={`gcomp-entry-${idea.id}`}
                      style={{ padding: '5px 7px', fontSize: '0.9em', borderBottom: '1px solid var(--brd)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {editing ? (
                        <>
                          <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                            style={{ width: '100%', minHeight: 60, padding: '4px 6px', fontSize: '0.85em', background: 'var(--sf)', border: '1px solid var(--brd)', borderRadius: 4, color: 'var(--tx)', boxSizing: 'border-box' }} />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => saveIdea(idea.id)} style={{ fontSize: '0.77em', padding: '2px 8px', borderRadius: 4, border: `1px solid ${color}`, background: 'transparent', color, cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ fontSize: '0.77em', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--brd)', background: 'transparent', color: 'var(--dim)', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                          <span style={{ flex: 1, color: 'var(--tx)', whiteSpace: 'pre-wrap' }}>{idea.value}</span>
                          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            <button onClick={() => { setEditingId(idea.id); setEditValue(idea.value || '') }} style={{ fontSize: '0.77em', border: 'none', background: 'none', color, cursor: 'pointer', padding: '0 2px' }}>✎</button>
                            <button onClick={() => deleteIdea(idea.id)} style={{ fontSize: '0.77em', border: 'none', background: 'none', color: '#ff3355', cursor: 'pointer', padding: '0 2px' }}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
