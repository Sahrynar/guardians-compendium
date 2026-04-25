import { useEffect, useRef, useState } from 'react'
import Modal from '../components/common/Modal'
import FilterPopup from '../components/common/FilterPopup'
import { TAB_RAINBOW, uid } from '../constants'
import { scrollAndFlashEntry } from '../components/common/entryNav'

const SIZE_COLS_WIKI = { XS: 4, S: 3, M: 2, L: 2, XL: 1 }
const tabColor = TAB_RAINBOW['wiki'] || '#aaaaaa'

const WIKI_CATS = [
  'Lore', 'World History', 'Cosmology', 'Power System',
  'Cultures', 'Languages', 'Religions', 'Factions',
  'Geography', 'Characters', 'Items', 'Events', 'Other'
]

const CONTENT_TYPES = [
  { k: 'text',      l: '¶ Text',       icon: '¶' },
  { k: 'table',     l: '⊞ Table',      icon: '⊞' },
  { k: 'flowchart', l: '⬡ Flowchart',  icon: '⬡' },
  { k: 'diagram',   l: '◈ Diagram',    icon: '◈' },
  { k: 'image',     l: '🖼 Image',     icon: '🖼' },
  { k: 'callout',   l: '! Callout',    icon: '!' },
]

// ── Simple Mermaid-style flowchart renderer ─────────────────────
function FlowchartRenderer({ content }) {
  const lines = (content || '').split('\n').filter(l => l.trim())
  const nodes = {}
  const edges = []
  lines.forEach(line => {
    const arrowMatch = line.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/)
    const nodeMatch = line.match(/^(\w+)\s*\[(.+?)\]/)
    if (arrowMatch) {
      edges.push({ from: arrowMatch[1].trim(), to: arrowMatch[2].trim(), label: arrowMatch[3]?.trim() })
    } else if (nodeMatch) {
      nodes[nodeMatch[1]] = nodeMatch[2]
    }
  })
  // Collect all node IDs
  edges.forEach(e => {
    if (!nodes[e.from]) nodes[e.from] = e.from
    if (!nodes[e.to]) nodes[e.to] = e.to
  })
  const nodeIds = Object.keys(nodes)
  if (!nodeIds.length) return <div style={{ color: 'var(--mut)', fontSize: '0.85em', fontStyle: 'italic' }}>No flowchart nodes defined</div>
  return (
    <div style={{ overflowX: 'auto', padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
        {nodeIds.map(id => {
          const outgoing = edges.filter(e => e.from === id)
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ padding: '4px 12px', background: 'var(--card)', border: '1px solid var(--cc)', borderRadius: 6, fontSize: '0.85em', fontWeight: 600, color: tabColor, whiteSpace: 'nowrap' }}>
                {nodes[id]}
              </div>
              {outgoing.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--dim)', fontSize: '0.77em' }}>
                  <span>→{e.label ? ` (${e.label})` : ''}</span>
                  <div style={{ padding: '4px 12px', background: 'var(--card)', border: '1px solid var(--cl)', borderRadius: 6, fontSize: '0.85em', color: 'var(--cl)', whiteSpace: 'nowrap' }}>{nodes[e.to] || e.to}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Table renderer ──────────────────────────────────────────────
function TableRenderer({ content }) {
  const rows = (content || '').split('\n').map(r => r.split('|').map(c => c.trim()).filter(Boolean))
  if (!rows.length || !rows[0].length) return <div style={{ color: 'var(--mut)', fontSize: '0.85em', fontStyle: 'italic' }}>No table data</div>
  const header = rows[0]
  const body = rows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c)))
  return (
    <div style={{ overflowX: 'auto', marginTop: 6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{ padding: '6px 10px', background: 'rgba(201,102,255,.1)', border: '1px solid var(--brd)', color: tabColor, fontWeight: 600, textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '5px 10px', border: '1px solid var(--brd)', color: 'var(--tx)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Wiki Block (single content block) ──────────────────────────
function WikiBlock({ block, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const { type, content, caption } = block
  return (
    <div style={{ marginBottom: 12, padding: 10, background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--r)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: '0.69em', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{type}</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <button className="btn btn-sm btn-outline" style={{ padding: '1px 5px', fontSize: '0.77em' }} onClick={onMoveUp}>↑</button>
          <button className="btn btn-sm btn-outline" style={{ padding: '1px 5px', fontSize: '0.77em' }} onClick={onMoveDown}>↓</button>
          <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor, padding: '1px 5px', fontSize: '0.77em' }} onClick={onEdit}>✎</button>
          <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544', padding: '1px 5px', fontSize: '0.77em' }} onClick={onDelete}>✕</button>
        </div>
      </div>

      {type === 'text' && (
        <div style={{ fontSize: '0.92em', color: 'var(--tx)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>
      )}
      {type === 'table' && <TableRenderer content={content} />}
      {type === 'flowchart' && <FlowchartRenderer content={content} />}
      {type === 'diagram' && (
        <div style={{ padding: 10, background: 'rgba(0,0,0,.2)', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.85em', color: 'var(--cl)', whiteSpace: 'pre-wrap' }}>{content}</div>
      )}
      {type === 'image' && content && (
        <div style={{ textAlign: 'center' }}>
          <img src={content} alt={caption || ''} style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid var(--brd)' }} />
          {caption && <div style={{ fontSize: '0.77em', color: 'var(--dim)', marginTop: 4, fontStyle: 'italic' }}>{caption}</div>}
        </div>
      )}
      {type === 'callout' && (
        <div style={{ padding: '8px 12px', background: 'rgba(201,102,255,.08)', border: '1px solid rgba(201,102,255,.3)', borderLeft: '3px solid var(--cc)', borderRadius: 4, fontSize: '0.85em', color: 'var(--tx)', lineHeight: 1.5 }}>
          {content}
        </div>
      )}
    </div>
  )
}

// ── Block Editor Modal ─────────────────────────────────────────
function BlockEditor({ block, onSave, onClose }) {
  const [type, setType] = useState(block?.type || 'text')
  const [content, setContent] = useState(block?.content || '')
  const [caption, setCaption] = useState(block?.caption || '')
  const imgRef = useRef()

  const placeholders = {
    text: 'Write your content here…',
    table: 'Name | Role | Notes\n--- | --- | ---\nLila | Guardian | Akatriel reborn\nMartyn | Guardian | Sevadan reborn',
    flowchart: 'Sevorech [Sevorech]\nLila [Lila / Akatriel]\nSevorech --> Lila : seeks redemption\nLila --> Sevorech : must convert',
    diagram: 'Describe your diagram in text/ASCII…\nOr paste structured notes.',
    callout: 'Important note, canon warning, or highlight…',
  }

  function handleImageUpload(e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setContent(ev.target.result)
    r.readAsDataURL(f)
  }

  return (
    <Modal open onClose={onClose} title={block ? 'Edit Block' : 'Add Block'} color={tabColor}>
      <div className="field">
        <label>Block Type</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.k}
              className={`fp ${type === ct.k ? 'active' : ''}`}
              style={{ color: tabColor }}
              onClick={() => setType(ct.k)}
            >{ct.l}</button>
          ))}
        </div>
      </div>

      {type === 'image' ? (
        <div className="field">
          <label>Image</label>
          <label style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--card)', border: '1px solid var(--brd)', borderRadius: 'var(--r)', cursor: 'pointer', fontSize: '0.85em' }}>
            📎 Upload Image
            <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          {content && <img src={content} alt="" style={{ maxWidth: '100%', marginTop: 8, borderRadius: 4, border: '1px solid var(--brd)' }} />}
          <div className="field" style={{ marginTop: 8 }}>
            <label>Caption (optional)</label>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Image caption…" />
          </div>
        </div>
      ) : (
        <div className="field">
          <label>Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={placeholders[type] || ''}
            style={{ minHeight: type === 'text' ? 120 : 80 }}
          />
          {type === 'table' && <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>Use | to separate columns, --- for header divider</div>}
          {type === 'flowchart' && <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 2 }}>Format: NodeA [Label] on its own line, then NodeA --&gt; NodeB : label</div>}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" style={{ background: tabColor }} onClick={() => onSave({ ...block, id: block?.id || uid(), type, content, caption })}>
          {block?.id ? 'Save' : 'Add Block'}
        </button>
      </div>
    </Modal>
  )
}

// ── Article Editor ──────────────────────────────────────────────
function ArticleEditor({ article, onSave, onCancel }) {
  const [title, setTitle] = useState(article?.title || '')
  const [category, setCategory] = useState(article?.category || 'Lore')
  const [summary, setSummary] = useState(article?.summary || '')
  const [blocks, setBlocks] = useState(article?.blocks || [])
  const [editingBlock, setEditingBlock] = useState(null)
  const [addingBlock, setAddingBlock] = useState(false)

  function saveBlock(block) {
    if (editingBlock) {
      setBlocks(prev => prev.map(b => b.id === block.id ? block : b))
      setEditingBlock(null)
    } else {
      setBlocks(prev => [...prev, block])
      setAddingBlock(false)
    }
  }

  function deleteBlock(id) { setBlocks(prev => prev.filter(b => b.id !== id)) }
  function moveBlock(idx, dir) {
    setBlocks(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return next
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-outline" onClick={onCancel}>← Back</button>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1em', color: tabColor, flex: 1 }}>
          {article?.id ? 'Editing Article' : 'New Article'}
        </div>
        <button className="btn btn-primary btn-sm" style={{ background: tabColor }} onClick={() => onSave({ ...article, id: article?.id || uid(), title, category, summary, blocks, updated: new Date().toISOString() })}>
          Save Article
        </button>
      </div>

      <div className="field"><label>Title *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title…" /></div>
      <div className="field-row">
        <div className="field"><label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {WIKI_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label>Summary (one line)</label><input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief description…" /></div>
      </div>

      {/* Blocks */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.92em', color: tabColor, marginBottom: 8 }}>Content Blocks</div>
        {!blocks.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--mut)', fontSize: '0.85em', border: '1px dashed var(--brd)', borderRadius: 'var(--r)' }}>
            No blocks yet. Add your first content block below.
          </div>
        )}
        {blocks.map((b, i) => (
          <WikiBlock
            key={b.id}
            block={b}
            onEdit={() => setEditingBlock(b)}
            onDelete={() => deleteBlock(b.id)}
            onMoveUp={() => moveBlock(i, -1)}
            onMoveDown={() => moveBlock(i, 1)}
          />
        ))}
        <button
          className="btn btn-outline"
          style={{ width: '100%', borderStyle: 'dashed', color: tabColor, borderColor: tabColor, marginTop: 4 }}
          onClick={() => setAddingBlock(true)}
        >+ Add Block</button>
      </div>

      {addingBlock && <BlockEditor onSave={saveBlock} onClose={() => setAddingBlock(false)} />}
      {editingBlock && <BlockEditor block={editingBlock} onSave={saveBlock} onClose={() => setEditingBlock(null)} />}
    </div>
  )
}

// ── Main Wiki Tab ───────────────────────────────────────────────
export default function Wiki({ db, navSearch }) {
  const articles = db.db.wiki || []
  const [search, setSearch] = useState(navSearch || '')
  const [catFilter, setCatFilter] = useState('all')
  const [colSize, setColSize] = useState(() => {
    try { return localStorage.getItem('colsize_wiki') || 'M' } catch { return 'M' }
  })
  function changeColSize(sz) { setColSize(sz); try { localStorage.setItem('colsize_wiki', sz) } catch {} }
  const [filterValues, setFilterValues] = useState({})
  const [editing, setEditing] = useState(null) // null = list, {} = new, {id,...} = edit
  const [confirmId, setConfirmId] = useState(null)
  const [autoOnly, setAutoOnly] = useState(false)
  const autoCount = articles.filter(a => a.auto_imported === true).length

  useEffect(() => { setSearch(navSearch || '') }, [navSearch])

  useEffect(() => {
    function onExpand(e) {
      const targetId = e?.detail?.id
      if (!targetId) return
      const entry = articles.find(x => x.id === targetId)
      if (!entry) return
      setEditing(entry)
      window.setTimeout(() => scrollAndFlashEntry(targetId), 50)
    }
    window.addEventListener('gcomp_expand', onExpand)
    return () => window.removeEventListener('gcomp_expand', onExpand)
  }, [articles])

  const filtered = articles.filter(a => {
    const ms = !search || JSON.stringify(a).toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || a.category === catFilter
    // Extra popup filters
    const selCats = filterValues['category'] || []
    const matchPopupCat = selCats.length === 0 || selCats.includes(a.category)
    const matchAuto = !autoOnly || a.auto_imported === true
    return ms && mc && matchPopupCat && matchAuto
  })

  function handleSave(article) {
    if (!db.db.wiki) db.db.wiki = []
    db.upsertEntry('wiki', article)
    setEditing(null)
  }

  if (editing !== null) {
    return <ArticleEditor article={editing?.id ? editing : null} onSave={handleSave} onCancel={() => setEditing(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {['XS','S','M','L','XL'].map(sz => (
            <button key={sz} onClick={() => changeColSize(sz)}
              style={{ fontSize: '0.69em', padding: '2px 7px', borderRadius: 8, cursor: 'pointer',
                background: colSize === sz ? tabColor : 'none',
                color: colSize === sz ? '#000' : 'var(--dim)',
                border: `1px solid ${colSize === sz ? tabColor : 'var(--brd)'}` }}>{sz}</button>
          ))}
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15em', color: tabColor }}>📖 Wiki</div>
        <input className="sx" placeholder="Search articles..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, maxWidth: 280 }} />
        <FilterPopup
          color={tabColor}
          filters={[{ key: 'category', label: 'Category', options: WIKI_CATS.map(c => ({ value: c, label: c })) }]}
          values={filterValues}
          onChange={(key, vals) => setFilterValues(prev => ({ ...prev, [key]: vals }))}
        />
        {autoCount > 0 && (
          <button onClick={() => setAutoOnly(v => !v)} style={{ fontSize: '0.77em', padding: '3px 9px', borderRadius: 12, border: `1px solid ${autoOnly ? '#ffcc00' : 'var(--brd)'}`, background: autoOnly ? '#ffcc0022' : 'none', color: autoOnly ? '#ffcc00' : 'var(--dim)', cursor: 'pointer' }}>
            📥 Auto-imported ({autoCount})
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{ background: tabColor }} onClick={() => setEditing({})}>+ New Article</button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
        <button className={`fp ${catFilter==='all'?'active':''}`} style={{ color: tabColor }} onClick={() => setCatFilter('all')}>All</button>
        {WIKI_CATS.filter(c => articles.some(a => a.category === c)).map(c => (
          <button key={c} className={`fp ${catFilter===c?'active':''}`} style={{ color: tabColor }} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {!filtered.length && (
        <div className="empty">
          <div className="empty-icon">📖</div>
          <p>No wiki articles yet.</p>
          <p style={{ fontSize: '0.85em', color: 'var(--mut)', maxWidth: 300, margin: '8px auto' }}>
            The wiki is where long-form lore lives — world history, cosmology, power system deep-dives, cultures, languages, factions. Supports text, tables, flowcharts, diagrams, images, and callouts.
          </p>
          <button className="btn btn-primary" style={{ background: tabColor }} onClick={() => setEditing({})}>+ New Article</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: {'XS':4,'S':3,'M':2,'L':1,'XL':1}[colSize] || 2 > 1 ? `repeat(${ {'XS':4,'S':3,'M':2,'L':1,'XL':1}[colSize] || 2 }, minmax(0,1fr))` : '1fr', gap: 6 }}>
        {filtered.map(a => (
          <div key={a.id} id={`gcomp-entry-${a.id}`} className="entry-card" style={{ '--card-color': tabColor }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="entry-title">{a.title}</div>
                {a.summary && <div style={{ fontSize: '0.85em', color: 'var(--dim)', marginTop: 2 }}>{a.summary}</div>}
              </div>
              <span className="badge" style={{ color: tabColor, borderColor: 'rgba(201,102,255,.3)', flexShrink: 0, marginLeft: 8 }}>{a.category}</span>
            </div>
            <div style={{ fontSize: '0.69em', color: 'var(--mut)', marginTop: 4 }}>
              {a.blocks?.length || 0} block{(a.blocks?.length || 0) !== 1 ? 's' : ''} · Updated {a.updated ? new Date(a.updated).toLocaleDateString() : '—'}
            </div>
            <div className="entry-actions" style={{ marginTop: 6 }}>
              <button className="btn btn-sm btn-outline" style={{ color: tabColor, borderColor: tabColor }} onClick={() => setEditing(a)}>✎ Edit</button>
              <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setConfirmId(a.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {confirmId && (
        <div className="confirm-overlay open">
          <div className="confirm-box">
            <p>Delete <strong>{articles.find(a=>a.id===confirmId)?.title}</strong>?</p>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>{' '}
            <button className="btn btn-danger btn-sm" onClick={() => { db.deleteEntry('wiki', confirmId); setConfirmId(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
