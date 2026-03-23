import { useState, useRef, useCallback } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

// ── Relationship types ──────────────────────────────────────────
const EDGE_TYPES = [
  'Parent/Child',
  'Married',
  'Romantic Partner',
  'Sibling',
  'Half-sibling',
  'Step-sibling',
  'Grandparent/Grandchild',
  'Aunt/Uncle – Niece/Nephew',
  'Cousin',
  'Step-parent/Step-child',
  'Half-aunt/Half-uncle – Niece/Nephew',
  'Adoptive Parent/Child',
  'Guardian/Ward',
  'Unknown',
]

const EDGE_COLORS = {
  'Parent/Child':                         '#7acc7a',
  'Married':                              '#ffcc00',
  'Romantic Partner':                     '#ff7090',
  'Sibling':                              '#88ddff',
  'Half-sibling':                         '#cc99ff',
  'Step-sibling':                         '#bb88cc',
  'Grandparent/Grandchild':              '#66bb88',
  'Aunt/Uncle – Niece/Nephew':           '#ffaa44',
  'Cousin':                               '#44cccc',
  'Step-parent/Step-child':              '#99bb66',
  'Half-aunt/Half-uncle – Niece/Nephew': '#dd9966',
  'Adoptive Parent/Child':               '#88cc99',
  'Guardian/Ward':                        '#aaaacc',
  'Unknown':                              '#666688',
}

const NODE_TYPES = ['Guardian', 'Royalty', 'Praelyn', 'Other', 'Unknown']

// ── Layout engine ───────────────────────────────────────────────
function buildLayout(nodes, edges) {
  if (!nodes.length) return { positioned: [], edgeLines: [] }

  const NODE_W = 150
  const NODE_H = 68
  const H_GAP  = 30
  const V_GAP  = 90

  // Build parent→child map (only for Parent/Child and Grandparent edges for hierarchy)
  const hierarchyEdgeTypes = new Set(['Parent/Child', 'Grandparent/Grandchild', 'Adoptive Parent/Child', 'Step-parent/Step-child'])
  const children = {}
  const parents  = {}
  nodes.forEach(n => { children[n.id] = []; parents[n.id] = [] })

  edges.forEach(e => {
    if (!hierarchyEdgeTypes.has(e.type)) return
    if (children[e.from] !== undefined) children[e.from].push(e.to)
    if (parents[e.to]   !== undefined) parents[e.to].push(e.from)
  })

  // Find roots (no parents in hierarchy)
  let roots = nodes.filter(n => !parents[n.id]?.length).map(n => n.id)
  if (!roots.length) roots = [nodes[0].id]

  // Subtree width calculation
  const swCache = {}
  function subtreeWidth(id, visited = new Set()) {
    if (swCache[id] !== undefined) return swCache[id]
    if (visited.has(id)) return NODE_W
    visited.add(id)
    const kids = children[id] || []
    if (!kids.length) { swCache[id] = NODE_W; return NODE_W }
    const w = Math.max(NODE_W, kids.reduce((sum, k) => sum + subtreeWidth(k, new Set(visited)) + H_GAP, -H_GAP))
    swCache[id] = w
    return w
  }

  // Place nodes
  const pos = {}
  function place(id, x, y, visited = new Set()) {
    if (visited.has(id)) return
    visited.add(id)
    pos[id] = { x, y }
    const kids = children[id] || []
    if (!kids.length) return
    const totalW = kids.reduce((sum, k) => sum + subtreeWidth(k) + H_GAP, -H_GAP)
    let cx = x + NODE_W / 2 - totalW / 2
    kids.forEach(k => {
      const sw = subtreeWidth(k)
      place(k, cx, y + NODE_H + V_GAP, new Set(visited))
      cx += sw + H_GAP
    })
  }

  // Place each root tree side by side
  let xOff = 20
  roots.forEach(r => {
    place(r, xOff, 20)
    xOff += subtreeWidth(r) + H_GAP * 3
  })

  // Any nodes not placed (disconnected from hierarchy — e.g. only have sibling/spouse edges)
  // Place them in a row at the bottom
  let orphanX = 20
  let maxY = 20
  Object.values(pos).forEach(p => { if (p.y > maxY) maxY = p.y })
  nodes.forEach(n => {
    if (!pos[n.id]) {
      pos[n.id] = { x: orphanX, y: maxY + NODE_H + V_GAP }
      orphanX += NODE_W + H_GAP
    }
  })

  const positioned = nodes.map(n => ({ ...n, ...(pos[n.id] || { x: 20, y: 20 }) }))

  // Build edge lines — use cubic bezier curves
  const edgeLines = edges.map(e => {
    const from = pos[e.from]
    const to   = pos[e.to]
    if (!from || !to) return null

    // Horizontal (sibling-like) edges go side to side; vertical go top to bottom
    const isHorizontal = ['Sibling','Half-sibling','Step-sibling','Married','Romantic Partner','Cousin'].includes(e.type)

    let x1, y1, x2, y2, cx1, cy1, cx2, cy2
    if (isHorizontal) {
      // Connect sides of nodes
      if (from.x < to.x) {
        x1 = from.x + NODE_W; y1 = from.y + NODE_H / 2
        x2 = to.x;            y2 = to.y + NODE_H / 2
      } else {
        x1 = from.x;          y1 = from.y + NODE_H / 2
        x2 = to.x + NODE_W;   y2 = to.y + NODE_H / 2
      }
      cx1 = x1 + (x2 - x1) / 2; cy1 = y1
      cx2 = x1 + (x2 - x1) / 2; cy2 = y2
    } else {
      // Connect bottom of parent to top of child
      x1 = from.x + NODE_W / 2; y1 = from.y + NODE_H
      x2 = to.x   + NODE_W / 2; y2 = to.y
      const midY = (y1 + y2) / 2
      cx1 = x1; cy1 = midY
      cx2 = x2; cy2 = midY
    }

    return { x1, y1, x2, y2, cx1, cy1, cx2, cy2, label: e.label, type: e.type, id: e.id }
  }).filter(Boolean)

  return { positioned, edgeLines }
}

// ── Node component ──────────────────────────────────────────────
function TreeNode({ node, selected, editMode, onClick, onEdit, onDelete, onAddRelation }) {
  const typeColors = {
    Guardian: 'var(--cc)',
    Royalty:  'var(--cca)',
    Praelyn:  'var(--cl)',
    Other:    '#8899bb',
    Unknown:  'var(--mut)',
  }
  const col = typeColors[node.nodeType] || '#8899bb'

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x, top: node.y,
        width: 150, minHeight: 68,
        background: 'var(--card)',
        border: `2px solid ${selected ? col : 'var(--brd)'}`,
        borderRadius: 8,
        padding: '6px 8px',
        cursor: 'pointer',
        boxShadow: selected ? `0 0 10px ${col}55` : '0 2px 6px rgba(0,0,0,.3)',
        transition: 'box-shadow .15s, border-color .15s',
        userSelect: 'none',
      }}
      onClick={() => onClick(node.id)}
    >
      {node.image && (
        <img src={node.image} alt=""
          style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', float: 'right', marginLeft: 6, border: `1px solid ${col}` }}
        />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Cinzel', serif", color: col, lineHeight: 1.3, marginBottom: 1 }}>
        {node.name}
      </div>
      {node.birth_year && (
        <div style={{ fontSize: 9, color: 'var(--dim)' }}>
          {node.birth_year}{node.death_year ? ` – ${node.death_year}` : ''}
        </div>
      )}
      {node.title && (
        <div style={{ fontSize: 9, color: 'var(--mut)', fontStyle: 'italic' }}>{node.title}</div>
      )}
      {selected && editMode && (
        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
          <button style={btnStyle(col)} onClick={e => { e.stopPropagation(); onEdit(node) }}>✎ Edit</button>
          <button style={btnStyle('var(--cca)')} onClick={e => { e.stopPropagation(); onAddRelation(node) }}>+ Link</button>
          <button style={btnStyle('#ff3355')} onClick={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
        </div>
      )}
    </div>
  )
}

function btnStyle(col) {
  return {
    background: 'none', border: `1px solid ${col}44`, color: col,
    fontSize: 9, cursor: 'pointer', padding: '1px 5px', borderRadius: 3,
  }
}

// ── Auto-populate helpers ───────────────────────────────────────
// Parse relationship type from character traits/notes text
function guessRelType(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('married') || t.includes('spouse') || t.includes('husband') || t.includes('wife')) return 'Married'
  if (t.includes('half-sibling') || t.includes('half sibling')) return 'Half-sibling'
  if (t.includes('sibling') || t.includes('brother') || t.includes('sister')) return 'Sibling'
  if (t.includes('parent') || t.includes('father') || t.includes('mother') || t.includes('son') || t.includes('daughter') || t.includes('child')) return 'Parent/Child'
  if (t.includes('grandparent') || t.includes('grandmother') || t.includes('grandfather')) return 'Grandparent/Grandchild'
  if (t.includes('aunt') || t.includes('uncle') || t.includes('niece') || t.includes('nephew')) return 'Aunt/Uncle – Niece/Nephew'
  if (t.includes('cousin')) return 'Cousin'
  return null
}

function buildNodesFromCharacters(characters) {
  const nodes = []
  const edges = []
  const seen  = new Set()

  characters.forEach(ch => {
    if (!ch.id || !ch.name) return
    const nodeId = 'ft_' + ch.id
    if (!seen.has(nodeId)) {
      seen.add(nodeId)
      // Detect nodeType from traits
      let nodeType = 'Other'
      const traitsLower = (ch.traits || '').toLowerCase()
      if (traitsLower.includes('guardian') || (ch.element && ch.element !== '')) nodeType = 'Guardian'
      if (traitsLower.includes('queen') || traitsLower.includes('king') || traitsLower.includes('royal')) nodeType = 'Royalty'
      if (traitsLower.includes('praelyn')) nodeType = 'Praelyn'

      nodes.push({
        id: nodeId,
        name: ch.display_name || ch.name,
        birth_year: ch.birthday || '',
        death_year: ch.notes?.includes('Deceased: true') ? '†' : '',
        title: '',
        nodeType,
        notes: '',
        char_id: ch.id,
        image: ch.portrait_canvas || null,
      })
    }
  })

  // Build edges from relationships array
  // The existing data has relationships as plain ID arrays — we can only make Unknown edges from those
  // But traits text often has explicit family language we can parse
  characters.forEach(ch => {
    const fromId = 'ft_' + ch.id
    const rels = ch.relationships || []

    rels.forEach(rel => {
      // rel might be a string ID or an object {id, type}
      const targetCharId = typeof rel === 'string' ? rel : rel.id
      const relTypeHint  = typeof rel === 'object' ? rel.type : null
      const toId = 'ft_' + targetCharId

      if (!seen.has(toId)) return // target not in tree

      // Avoid duplicate edges
      const edgeKey = [fromId, toId].sort().join('|')
      if (edges.find(e => [e.from, e.to].sort().join('|') === edgeKey)) return

      // Try to determine relationship type
      let type = relTypeHint || guessRelType(ch.traits) || 'Unknown'

      // More specific: check if traits mention this specific character
      const targetChar = characters.find(c => c.id === targetCharId)
      if (targetChar) {
        const combined = (ch.traits || '') + ' ' + (ch.notes || '')
        const targetName = targetChar.display_name || targetChar.name || ''
        // Look for mentions near family words
        const nameIdx = combined.toLowerCase().indexOf(targetName.toLowerCase())
        if (nameIdx >= 0) {
          const snippet = combined.slice(Math.max(0, nameIdx - 40), nameIdx + 60).toLowerCase()
          const parsed = guessRelType(snippet)
          if (parsed) type = parsed
        }
      }

      edges.push({ id: uid(), from: fromId, to: toId, type, label: '' })
    })
  })

  return { nodes, edges }
}

// ── Main component ──────────────────────────────────────────────
export default function FamilyTree({ db }) {
  const treeData = (db.db.family_tree || [
    { id: '_root', nodes: [], edges: [], bg_color: '#060608', bg_image: null, name: 'Family Tree' }
  ])[0]

  const [nodes,     setNodes]     = useState(treeData.nodes || [])
  const [edges,     setEdges]     = useState(treeData.edges || [])
  const [bgColor,   setBgColor]   = useState(treeData.bg_color || '#060608')
  const [bgImage,   setBgImage]   = useState(treeData.bg_image || null)
  const [selected,  setSelected]  = useState(null)
  const [nodeModal, setNodeModal] = useState(null)   // null | {} | node
  const [edgeModal, setEdgeModal] = useState(null)   // null | {} | edge | {from: node}
  const [editMode,  setEditMode]  = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const bgRef = useRef()

  const { positioned, edgeLines } = buildLayout(nodes, edges)
  const maxX = Math.max(700, ...positioned.map(n => n.x + 180))
  const maxY = Math.max(450, ...positioned.map(n => n.y + 120))

  // ── Persistence ───────────────────────────────────────────────
  function persist(newNodes, newEdges, newBg, newBgImg) {
    db.upsertEntry('family_tree', {
      id:        '_root',
      name:      'Family Tree',
      nodes:     newNodes  ?? nodes,
      edges:     newEdges  ?? edges,
      bg_color:  newBg     ?? bgColor,
      bg_image:  newBgImg  !== undefined ? newBgImg : bgImage,
    })
  }

  // ── Node CRUD ─────────────────────────────────────────────────
  function saveNode(node) {
    const isNew = !node.id || !nodes.find(n => n.id === node.id)
    const newNodes = isNew
      ? [...nodes, { ...node, id: node.id || uid() }]
      : nodes.map(n => n.id === node.id ? node : n)
    setNodes(newNodes)
    persist(newNodes, null, null, undefined)
    setNodeModal(null)
  }

  function deleteNode(id) {
    const newNodes = nodes.filter(n => n.id !== id)
    const newEdges = edges.filter(e => e.from !== id && e.to !== id)
    setNodes(newNodes); setEdges(newEdges)
    persist(newNodes, newEdges, null, undefined)
    setSelected(null)
  }

  // ── Edge CRUD ─────────────────────────────────────────────────
  function saveEdge(edge) {
    const exists = edge.id && edges.find(e => e.id === edge.id)
    const newEdges = exists
      ? edges.map(e => e.id === edge.id ? edge : e)
      : [...edges, { ...edge, id: edge.id || uid() }]
    setEdges(newEdges)
    persist(null, newEdges, null, undefined)
    setEdgeModal(null)
  }

  function deleteEdge(id) {
    const newEdges = edges.filter(e => e.id !== id)
    setEdges(newEdges)
    persist(null, newEdges, null, undefined)
  }

  // ── Auto-populate ─────────────────────────────────────────────
  function autoPopulate() {
    const chars = db.db.characters || []
    if (!chars.length) { alert('No characters found in the database.'); return }
    const { nodes: newNodes, edges: newEdges } = buildNodesFromCharacters(chars)
    setNodes(newNodes); setEdges(newEdges)
    persist(newNodes, newEdges, null, undefined)
  }

  // ── BG image ──────────────────────────────────────────────────
  function handleBgImage(e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => { setBgImage(ev.target.result); persist(null, null, null, ev.target.result) }
    r.readAsDataURL(f)
  }

  // ── Clear tree ────────────────────────────────────────────────
  function clearTree() {
    setNodes([]); setEdges([])
    persist([], [], null, null)
    setConfirmClear(false)
    setSelected(null)
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: 'var(--cl)' }}>🌳 Family Tree</div>

        <button
          className="btn btn-sm btn-outline"
          style={{ color: editMode ? 'var(--cc)' : 'var(--dim)', borderColor: editMode ? 'var(--cc)' : 'var(--brd)' }}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? '✓ Editing' : '✎ Edit Mode'}
        </button>

        {editMode && (
          <>
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }}
              onClick={() => setNodeModal({})}>+ Person</button>
            <button className="btn btn-sm btn-outline" style={{ color: 'var(--cca)', borderColor: 'var(--cca)' }}
              onClick={() => setEdgeModal({})}>+ Relation</button>
          </>
        )}

        <button
          className="btn btn-sm btn-outline"
          style={{ color: 'var(--cl)', borderColor: 'var(--cl)', marginLeft: 'auto' }}
          onClick={autoPopulate}
          title="Reads all characters from the Characters tab and builds tree nodes from them"
        >
          ⟳ Build from Characters
        </button>

        {nodes.length > 0 && editMode && (
          <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }}
            onClick={() => setConfirmClear(true)}>🗑 Clear Tree</button>
        )}
      </div>

      {/* ── Background controls (edit mode only) ── */}
      {editMode && (
        <div className="tbar" style={{ paddingTop: 0, gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
            BG color:
            <input type="color" value={bgColor}
              onChange={e => { setBgColor(e.target.value); persist(null, null, e.target.value, undefined) }}
              style={{ width: 28, height: 20, padding: 0, border: '1px solid var(--brd)', borderRadius: 3, cursor: 'pointer' }}
            />
          </span>
          <label style={{ fontSize: 10, color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            🖼 BG image:
            <input ref={bgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImage} />
            <span style={{ color: 'var(--cc)', textDecoration: 'underline' }}>Upload</span>
          </label>
          {bgImage && (
            <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544', fontSize: 9 }}
              onClick={() => { setBgImage(null); persist(null, null, null, null) }}>Remove BG</button>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!nodes.length && (
        <div className="empty">
          <div className="empty-icon">🌳</div>
          <p>No family tree yet.</p>
          <p style={{ fontSize: 11, color: 'var(--mut)', maxWidth: 340, margin: '6px auto 14px' }}>
            Use <strong>Build from Characters</strong> to auto-populate from your character data, or enable Edit Mode to add people manually.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ background: 'var(--cl)', color: '#000' }} onClick={autoPopulate}>
              ⟳ Build from Characters
            </button>
            <button className="btn btn-outline" style={{ color: 'var(--cc)', borderColor: 'var(--cc)' }}
              onClick={() => { setEditMode(true); setNodeModal({}) }}>
              + Add Person Manually
            </button>
          </div>
        </div>
      )}

      {/* ── Tree canvas ── */}
      {nodes.length > 0 && (
        <div style={{
          overflowX: 'auto', overflowY: 'auto', maxHeight: '72vh',
          border: '1px solid var(--brd)', borderRadius: 'var(--rl)',
          background: bgImage ? `url(${bgImage}) center/cover` : bgColor,
          position: 'relative', minHeight: 300,
        }}>
          <div style={{ position: 'relative', width: maxX, height: maxY }}>

            {/* SVG edges */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                {Object.entries(EDGE_COLORS).map(([type, col]) => (
                  <marker key={type} id={`arrow-${type.replace(/[^a-zA-Z]/g,'')}`}
                    markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={col} opacity="0.6" />
                  </marker>
                ))}
              </defs>
              {edgeLines.map((line, i) => {
                const col = EDGE_COLORS[line.type] || '#666688'
                const markerId = `arrow-${(line.type || '').replace(/[^a-zA-Z]/g,'')}`
                const midX = (line.x1 + line.x2) / 2
                const midY = (line.y1 + line.y2) / 2
                return (
                  <g key={i}>
                    <path
                      d={`M ${line.x1} ${line.y1} C ${line.cx1} ${line.cy1}, ${line.cx2} ${line.cy2}, ${line.x2} ${line.y2}`}
                      stroke={col} strokeWidth={1.5} fill="none" opacity={0.75}
                      markerEnd={`url(#${markerId})`}
                    />
                    {(line.label || line.type) && (
                      <text x={midX} y={midY - 4} textAnchor="middle" fontSize={8}
                        fill={col} opacity={0.85} dominantBaseline="middle"
                        style={{ pointerEvents: 'none', textShadow: '0 1px 3px #000' }}>
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
                editMode={editMode}
                onClick={id => setSelected(selected === id ? null : id)}
                onEdit={n => setNodeModal(n)}
                onDelete={deleteNode}
                onAddRelation={n => setEdgeModal({ from: n.id })}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {nodes.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '8px 2px', fontSize: 9, color: 'var(--dim)' }}>
          {Object.entries(EDGE_COLORS).map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 18, height: 2, background: c, borderRadius: 1 }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Node stats ── */}
      {nodes.length > 0 && (
        <div style={{ fontSize: 9, color: 'var(--mut)', padding: '2px 0 6px' }}>
          {nodes.length} people · {edges.length} relationships
          {(db.db.characters || []).length > nodes.length && (
            <span style={{ color: 'var(--cca)', marginLeft: 8 }}>
              ({(db.db.characters || []).length - nodes.length} characters not yet in tree — click "Build from Characters" to sync)
            </span>
          )}
        </div>
      )}

      {/* ── Add/Edit node modal ── */}
      <Modal open={!!nodeModal} onClose={() => setNodeModal(null)}
        title={nodeModal?.id ? 'Edit Person' : 'Add Person'} color="var(--cl)">
        {nodeModal && (
          <NodeForm
            node={nodeModal}
            onSave={saveNode}
            onCancel={() => setNodeModal(null)}
            db={db}
            nodeTypes={NODE_TYPES}
          />
        )}
      </Modal>

      {/* ── Add/Edit edge modal ── */}
      <Modal open={!!edgeModal} onClose={() => setEdgeModal(null)}
        title={edgeModal?.id ? 'Edit Relation' : 'Add Relation'} color="var(--cca)">
        {edgeModal && (
          <EdgeForm
            edge={edgeModal}
            nodes={nodes}
            onSave={saveEdge}
            onDelete={edgeModal.id ? deleteEdge : null}
            onCancel={() => setEdgeModal(null)}
            edgeTypes={EDGE_TYPES}
          />
        )}
      </Modal>

      {/* ── Confirm clear modal ── */}
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear Family Tree" color="#ff3355">
        <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
          This will remove all {nodes.length} people and {edges.length} relationships from the tree. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setConfirmClear(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ff3355' }} onClick={clearTree}>Clear Tree</button>
        </div>
      </Modal>
    </div>
  )
}

// ── Node form ───────────────────────────────────────────────────
function NodeForm({ node, onSave, onCancel, db, nodeTypes }) {
  const [form, setForm] = useState({
    name: '', birth_year: '', death_year: '', title: '', nodeType: 'Other', notes: '',
    ...node,
  })
  const [image, setImage] = useState(node.image || null)
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const chars = db.db.characters || []

  return (
    <>
      <div className="field">
        <label>Link to Character (optional)</label>
        <select value={form.char_id || ''} onChange={e => {
          const ch = chars.find(c => c.id === e.target.value)
          setForm(p => ({
            ...p,
            char_id: e.target.value,
            name: ch ? (ch.display_name || ch.name) : p.name,
            birth_year: ch?.birthday || p.birth_year,
          }))
          if (ch?.portrait_canvas) setImage(ch.portrait_canvas)
        }}>
          <option value="">— None —</option>
          {chars.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
        </select>
      </div>

      <div className="field"><label>Name *</label>
        <input value={form.name} onChange={s('name')} placeholder="Person's name" />
      </div>

      <div className="field-row">
        <div className="field"><label>Birth Year</label>
          <input value={form.birth_year} onChange={s('birth_year')} placeholder="e.g. 1517 or HC 1" />
        </div>
        <div className="field"><label>Death Year</label>
          <input value={form.death_year} onChange={s('death_year')} placeholder="blank if living" />
        </div>
      </div>

      <div className="field-row">
        <div className="field"><label>Title / Role</label>
          <input value={form.title} onChange={s('title')} placeholder="e.g. Queen of Lurlen" />
        </div>
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
              const r = new FileReader()
              r.onload = ev => setImage(ev.target.result)
              r.readAsDataURL(f)
            }} />
          </label>
          {image && (
            <button style={{ background: 'none', border: 'none', color: '#ff3355', cursor: 'pointer', fontSize: 11 }}
              onClick={() => setImage(null)}>Remove</button>
          )}
        </div>
      </div>

      <div className="field"><label>Notes</label>
        <textarea value={form.notes} onChange={s('notes')} />
      </div>

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--cl)', color: '#000' }}
          onClick={() => {
            if (!form.name.trim()) { alert('Name is required.'); return }
            onSave({ ...form, image })
          }}>
          {node.id ? 'Save Changes' : 'Add Person'}
        </button>
      </div>
    </>
  )
}

// ── Edge form ───────────────────────────────────────────────────
function EdgeForm({ edge, nodes, onSave, onDelete, onCancel, edgeTypes }) {
  const [form, setForm] = useState({
    from: '', to: '', type: 'Parent/Child', label: '',
    ...edge,
  })
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Direction note for the selected type
  const directionNote = {
    'Parent/Child':                         '"From" is the PARENT, "To" is the CHILD.',
    'Grandparent/Grandchild':               '"From" is the GRANDPARENT, "To" is the GRANDCHILD.',
    'Adoptive Parent/Child':                '"From" is the ADOPTIVE PARENT, "To" is the CHILD.',
    'Step-parent/Step-child':               '"From" is the STEP-PARENT, "To" is the STEP-CHILD.',
    'Aunt/Uncle – Niece/Nephew':            '"From" is the AUNT/UNCLE, "To" is the NIECE/NEPHEW.',
    'Half-aunt/Half-uncle – Niece/Nephew':  '"From" is the HALF-AUNT/UNCLE, "To" is the NIECE/NEPHEW.',
  }[form.type]

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
        {directionNote && (
          <div style={{ fontSize: 9, color: 'var(--cca)', marginTop: 3 }}>{directionNote}</div>
        )}
      </div>

      <div className="field">
        <label>Custom Label <span style={{ color: 'var(--mut)', fontWeight: 400 }}>(optional — overrides type label)</span></label>
        <input value={form.label} onChange={s('label')} placeholder="Leave blank to show type" />
      </div>

      <div className="modal-actions">
        {onDelete && (
          <button className="btn btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544', marginRight: 'auto' }}
            onClick={() => { onDelete(form.id); }}>Delete</button>
        )}
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ background: 'var(--cca)' }}
          onClick={() => {
            if (!form.from || !form.to) { alert('Please select both people.'); return }
            if (form.from === form.to) { alert('Cannot link a person to themselves.'); return }
            onSave(form)
          }}>
          {edge.id ? 'Save Changes' : 'Add Relation'}
        </button>
      </div>
    </>
  )
}
