import { useState, useRef, useCallback } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

// ── Layout engine (simple top-down tree) ───────────────────────
function buildLayout(nodes, edges) {
  if (!nodes.length) return { positioned: [], edgeLines: [] }

  // Build adjacency
  const children = {}
  const parents = {}
  nodes.forEach(n => { children[n.id] = []; parents[n.id] = [] })
  edges.forEach(e => {
    if (children[e.from]) children[e.from].push(e.to)
    if (parents[e.to]) parents[e.to].push(e.from)
  })

  // Find roots
  const roots = nodes.filter(n => !parents[n.id]?.length).map(n => n.id)
  if (!roots.length && nodes.length) roots.push(nodes[0].id)

  const NODE_W = 140, NODE_H = 60, H_GAP = 20, V_GAP = 80
  const pos = {}

  function subtreeWidth(id, visited = new Set()) {
    if (visited.has(id)) return NODE_W
    visited.add(id)
    const kids = children[id] || []
    if (!kids.length) return NODE_W
    return Math.max(NODE_W, kids.reduce((sum, k) => sum + subtreeWidth(k, visited) + H_GAP, 0) - H_GAP)
  }

  function place(id, x, y, visited = new Set()) {
    if (visited.has(id)) return
    visited.add(id)
    pos[id] = { x, y }
    const kids = children[id] || []
    if (!kids.length) return
    const totalW = kids.reduce((sum, k) => sum + subtreeWidth(k) + H_GAP, 0) - H_GAP
    let cx = x + NODE_W / 2 - totalW / 2
    kids.forEach(k => {
      const sw = subtreeWidth(k)
      place(k, cx, y + NODE_H + V_GAP, visited)
      cx += sw + H_GAP
    })
  }

  let xOff = 20
  roots.forEach(r => {
    place(r, xOff, 20)
    xOff += subtreeWidth(r) + H_GAP * 2
  })

  const positioned = nodes.map(n => ({ ...n, ...(pos[n.id] || { x: 20, y: 20 }) }))

  const edgeLines = edges.map(e => {
    const from = pos[e.from], to = pos[e.to]
    if (!from || !to) return null
    const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H
    const x2 = to.x + NODE_W / 2, y2 = to.y
    return { x1, y1, x2, y2, label: e.label, type: e.type }
  }).filter(Boolean)

  return { positioned, edgeLines }
}

// ── Node component ──────────────────────────────────────────────
function TreeNode({ node, selected, onClick, onEdit, onDelete }) {
  const charColors = { Guardian: 'var(--cc)', Royalty: 'var(--cca)', Other: 'var(--cl)', Unknown: 'var(--mut)' }
  const col = charColors[node.nodeType] || 'var(--cl)'
  return (
    <div
      style={{
        position: 'absolute', left: node.x, top: node.y,
        width: 140, minHeight: 60, background: 'var(--card)',
        border: `2px solid ${selected ? col : 'var(--brd)'}`,
        borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
        boxShadow: selected ? `0 0 8px ${col}44` : 'none',
        transition: '.15s'
      }}
      onClick={() => onClick(node.id)}
    >
      {node.image && (
        <img src={node.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', float: 'right', marginLeft: 6, border: `1px solid ${col}` }} />
      )}
      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Cinzel', serif", color: col, lineHeight: 1.2 }}>{node.name}</div>
      {node.birth_year && <div style={{ fontSize: 9, color: 'var(--dim)' }}>{node.birth_year}{node.death_year ? ` – ${node.death_year}` : ''}</div>}
      {node.title && <div style={{ fontSize: 9, color: 'var(--mut)' }}>{node.title}</div>}
      {selected && (
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          <button style={{ background: 'none', border: 'none', color: col, fontSize: 10, cursor: 'pointer', padding: '1px 4px', borderRadius: 3, border: '1px solid ' + col }} onClick={e => { e.stopPropagation(); onEdit(node) }}>✎</button>
          <button style={{ background: 'none', border: 'none', color: '#ff3355', fontSize: 10, cursor: 'pointer', padding: '1px 4px', borderRadius: 3, border: '1px solid #ff335544' }} onClick={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
        </div>
      )}
    </div>
  )
}

// ── Main Family Tree Tab ────────────────────────────────────────
export default function FamilyTree({ db }) {
  const treeData = (db.db.family_tree || [{ id: '_root', nodes: [], edges: [], bg_color: '#060608', bg_image: null, name: 'Doyle / Lajen Family' }])[0]

  const [nodes, setNodes] = useState(treeData.nodes || [])
  const [edges, setEdges] = useState(treeData.edges || [])
  const [bgColor, setBgColor] = useState(treeData.bg_color || '#060608')
  const [bgImage, setBgImage] = useState(treeData.bg_image || null)
  const [selected, setSelected] = useState(null)
  const [nodeModal, setNodeModal] = useState(null)
  const [edgeModal, setEdgeModal] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const svgRef = useRef()
  const bgRef = useRef()

  const { positioned, edgeLines } = buildLayout(nodes, edges)
  const maxX = Math.max(600, ...positioned.map(n => n.x + 160))
  const maxY = Math.max(400, ...positioned.map(n => n.y + 100))

  function persist(newNodes, newEdges, newBg, newBgImg) {
    const data = [{
      id: '_root', nodes: newNodes ?? nodes, edges: newEdges ?? edges,
      bg_color: newBg ?? bgColor, bg_image: newBgImg ?? bgImage,
      name: 'Family Tree'
    }]
    db.upsertEntry('family_tree', data[0])
  }

  function saveNode(node) {
    const isNew = !node.id || !nodes.find(n => n.id === node.id)
    const newNodes = isNew ? [...nodes, { ...node, id: node.id || uid() }] : nodes.map(n => n.id === node.id ? node : n)
    setNodes(newNodes); persist(newNodes, null, null, null); setNodeModal(null)
  }

  function deleteNode(id) {
    const newNodes = nodes.filter(n => n.id !== id)
    const newEdges = edges.filter(e => e.from !== id && e.to !== id)
    setNodes(newNodes); setEdges(newEdges); persist(newNodes, newEdges, null, null); setSelected(null)
  }

  function saveEdge(edge) {
    const newEdges = edge.id && edges.find(e => e.id === edge.id)
      ? edges.map(e => e.id === edge.id ? edge : e)
      : [...edges, { ...edge, id: edge.id || uid() }]
    setEdges(newEdges); persist(null, newEdges, null, null); setEdgeModal(null)
  }

  function handleBgImage(e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => { setBgImage(ev.target.result); persist(null, null, null, ev.target.result) }
    r.readAsDataURL(f)
  }

  const NODE_TYPES = ['Guardian', 'Royalty', 'Other', 'Unknown']
  const EDGE_TYPES = ['Parent/Child', 'Romantic Partner', 'Married', 'Sibling', 'Half-sibling', 'Unknown']

  return (
    <div>
      {/* Toolbar */}
      <div className="tbar">
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cl)' }}>🌳 Family Tree</div>
        <button className="btn btn-sm btn-outline" style={{ color: editMode ? 'var(--cc)' : 'var(--dim)', borderColor: editMode ? 'var(--cc)' : 'var(--brd)' }} onClick={() => setEditMode(v => !v)}>
          {editMode ? '✓ Editing' : '✎ Edit Mode'}
        </button>
        {editMode && (
          <>
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={() => setNodeModal({})}>+ Person</button>
            <button className="btn btn-sm btn-outline" style={{ color: 'var(--cca)', borderColor: 'var(--cca)' }} onClick={() => setEdgeModal({})}>+ Relation</button>
          </>
        )}
      </div>

      {/* Background controls */}
      {editMode && (
        <div className="tbar" style={{ paddingTop: 0, gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>BG color:</span>
            <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); persist(null, null, e.target.value, null) }} style={{ width: 30, height: 22, padding: 0, border: '1px solid var(--brd)', borderRadius: 3, cursor: 'pointer' }} />
          </div>
          <label style={{ fontSize: 10, color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            🖼 BG image: <input ref={bgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImage} />
            <span style={{ color: 'var(--cc)', textDecoration: 'underline' }}>Upload</span>
          </label>
          {bgImage && <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544', fontSize: 9 }} onClick={() => { setBgImage(null); persist(null, null, null, null) }}>Remove BG</button>}
        </div>
      )}

      {!nodes.length && (
        <div className="empty">
          <div className="empty-icon">🌳</div>
          <p>No family tree yet.</p>
          <p style={{ fontSize: 11, color: 'var(--mut)', maxWidth: 300, margin: '8px auto 12px' }}>Enable Edit Mode and add people and relationships to build your family tree.</p>
          <button className="btn btn-primary" style={{ background: 'var(--cl)', color: '#000' }} onClick={() => { setEditMode(true); setNodeModal({}) }}>+ Add First Person</button>
        </div>
      )}

      {/* Tree canvas */}
      {nodes.length > 0 && (
        <div style={{
          overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh',
          border: '1px solid var(--brd)', borderRadius: 'var(--rl)',
          background: bgImage ? `url(${bgImage}) center/cover` : bgColor,
          position: 'relative', minHeight: 300
        }}
        >
          <div style={{ position: 'relative', width: maxX, height: maxY }}>
            {/* SVG edges */}
            <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {edgeLines.map((line, i) => {
                const midX = (line.x1 + line.x2) / 2
                const midY = (line.y1 + line.y2) / 2
                const strokeColor = { 'Parent/Child': '#7acc7a', 'Romantic Partner': '#ff7090', 'Married': '#ffcc00', 'Sibling': '#88ddff', 'Half-sibling': '#cc99ff' }[line.type] || '#666688'
                return (
                  <g key={i}>
                    <path d={`M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`}
                      stroke={strokeColor} strokeWidth={1.5} fill="none" opacity={0.7} />
                    {line.label && (
                      <text x={midX} y={midY} textAnchor="middle" fontSize={9} fill={strokeColor} dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                        {line.label || line.type}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
            {/* Nodes */}
            {positioned.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                selected={selected === node.id}
                onClick={id => setSelected(selected === id ? null : id)}
                onEdit={n => setNodeModal(n)}
                onDelete={deleteNode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {nodes.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0', fontSize: 9, color: 'var(--dim)' }}>
          {[['Parent/Child','#7acc7a'],['Romantic Partner','#ff7090'],['Married','#ffcc00'],['Sibling','#88ddff'],['Half-sibling','#cc99ff']].map(([l,c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 2, background: c, borderRadius: 1 }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit node modal */}
      <Modal open={!!nodeModal} onClose={() => setNodeModal(null)} title={nodeModal?.id ? 'Edit Person' : 'Add Person'} color="var(--cl)">
        {nodeModal && <NodeForm node={nodeModal} onSave={saveNode} onCancel={() => setNodeModal(null)} db={db} nodeTypes={NODE_TYPES} />}
      </Modal>

      {/* Add/Edit edge modal */}
      <Modal open={!!edgeModal} onClose={() => setEdgeModal(null)} title={edgeModal?.id ? 'Edit Relation' : 'Add Relation'} color="var(--cca)">
        {edgeModal && <EdgeForm edge={edgeModal} nodes={nodes} onSave={saveEdge} onCancel={() => setEdgeModal(null)} edgeTypes={EDGE_TYPES} />}
      </Modal>
    </div>
  )
}

function NodeForm({ node, onSave, onCancel, db, nodeTypes }) {
  const [form, setForm] = useState({ name: '', birth_year: '', death_year: '', title: '', nodeType: 'Other', notes: '', ...node })
  const [image, setImage] = useState(node.image || null)
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const chars = db.db.characters || []

  return (
    <>
      <div className="field"><label>Name *</label><input value={form.name} onChange={s('name')} placeholder="Person's name" /></div>
      <div className="field"><label>Link to Character (optional)</label>
        <select value={form.char_id || ''} onChange={e => {
          const ch = chars.find(c => c.id === e.target.value)
          setForm(p => ({ ...p, char_id: e.target.value, name: ch ? (ch.display_name || ch.name) : p.name }))
          if (ch?.portrait_canvas) setImage(ch.portrait_canvas)
        }}>
          <option value="">— None —</option>
          {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field"><label>Birth Year</label><input value={form.birth_year} onChange={s('birth_year')} placeholder="e.g. 1517 or HC 1" /></div>
        <div className="field"><label>Death Year</label><input value={form.death_year} onChange={s('death_year')} placeholder="or blank if living" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Title / Role</label><input value={form.title} onChange={s('title')} placeholder="e.g. Queen of Lurlen" /></div>
        <div className="field"><label>Type</label>
          <select value={form.nodeType} onChange={s('nodeType')}>
            {nodeTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Portrait Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {image && <img src={image} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brd)' }} />}
          <label style={{ cursor: 'pointer', fontSize: 11, color: 'var(--cc)', textDecoration: 'underline' }}>
            {image ? 'Change' : 'Upload photo'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files[0]; if (!f) return
              const r = new FileReader(); r.onload = ev => setImage(ev.target.result); r.readAsDataURL(f)
            }} />
          </label>
          {image && <button style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', fontSize: 11 }} onClick={() => setImage(null)}>Remove</button>}
        </div>
      </div>
      <div className="field"><label>Notes</label><textarea value={form.notes} onChange={s('notes')} /></div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--cl)', color: '#000' }} onClick={() => onSave({ ...form, image })}>
          {node.id ? 'Save' : 'Add Person'}
        </button>
      </div>
    </>
  )
}

function EdgeForm({ edge, nodes, onSave, onCancel, edgeTypes }) {
  const [form, setForm] = useState({ from: '', to: '', type: 'Parent/Child', label: '', ...edge })
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <>
      <div className="field-row">
        <div className="field"><label>From *</label>
          <select value={form.from} onChange={s('from')}>
            <option value="">— Pick person —</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div className="field"><label>To *</label>
          <select value={form.to} onChange={s('to')}>
            <option value="">— Pick person —</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Relationship Type</label>
        <select value={form.type} onChange={s('type')}>
          {edgeTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="field"><label>Custom Label (optional)</label><input value={form.label} onChange={s('label')} placeholder="Leave blank to use type" /></div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--cca)' }} onClick={() => onSave(form)}>
          {edge.id ? 'Save' : 'Add Relation'}
        </button>
      </div>
    </>
  )
}
