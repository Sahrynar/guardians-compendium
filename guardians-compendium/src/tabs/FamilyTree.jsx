import { useState, useRef, useEffect, useCallback } from 'react'
import Modal from '../components/common/Modal'
import { uid } from '../constants'

// ── Built-in relationship types ─────────────────────────────────
const BUILTIN_EDGE_TYPES = [
  'Parent/Child', 'Married', 'Romantic Partner', 'Other Parent',
  'Sibling', 'Half-sibling', 'Step-sibling',
  'Grandparent/Grandchild', 'Aunt/Uncle \u2013 Niece/Nephew',
  'Half-aunt/Half-uncle \u2013 Niece/Nephew', 'Cousin',
  'Step-parent/Step-child', 'Adoptive Parent/Child',
  'Guardian/Ward', 'Reincarnation', 'Friend', 'Ally', 'Enemy',
  'Unknown',
]

const BUILTIN_EDGE_COLORS = {
  'Parent/Child':                         '#7acc7a',
  'Married':                              '#ffcc00',
  'Romantic Partner':                     '#ff7090',
  'Other Parent':                         '#ff9944',
  'Sibling':                              '#88ddff',
  'Half-sibling':                         '#cc99ff',
  'Step-sibling':                         '#bb88cc',
  'Grandparent/Grandchild':              '#66bb88',
  'Aunt/Uncle \u2013 Niece/Nephew':      '#ffaa44',
  'Half-aunt/Half-uncle \u2013 Niece/Nephew': '#dd9966',
  'Cousin':                               '#44cccc',
  'Step-parent/Step-child':              '#99bb66',
  'Adoptive Parent/Child':               '#88cc99',
  'Guardian/Ward':                        '#aaaacc',
  'Reincarnation':                        '#e577ff',
  'Friend':                               '#77ddbb',
  'Ally':                                 '#99bbff',
  'Enemy':                                '#ff5533',
  'Unknown':                              '#ff3388',
}

const BUILTIN_NODE_TYPES = ['Guardian', 'Royalty', 'Praelyn', 'Other', 'Unknown']

const NODE_TYPE_COLORS = {
  Guardian: 'var(--cc)',
  Royalty:  'var(--cca)',
  Praelyn:  'var(--cl)',
  Other:    '#8899bb',
  Unknown:  'var(--mut)',
}

const HIER_TYPES = new Set([
  'Parent/Child', 'Grandparent/Grandchild', 'Adoptive Parent/Child',
  'Step-parent/Step-child', 'Aunt/Uncle \u2013 Niece/Nephew',
  'Half-aunt/Half-uncle \u2013 Niece/Nephew', 'Guardian/Ward',
])

// ── Layout engine ───────────────────────────────────────────────
function buildLayout(nodes, edges, storedPos) {
  if (!nodes.length) return { positioned: [], edgeLines: [] }
  const NODE_W = 160, NODE_H = 72, H_GAP = 40, V_GAP = 100
  const sp = storedPos || {}

  const children = {}, parents = {}
  nodes.forEach(n => { children[n.id] = []; parents[n.id] = [] })
  edges.forEach(e => {
    if (!HIER_TYPES.has(e.type)) return
    if (children[e.from] !== undefined) children[e.from].push(e.to)
    if (parents[e.to]   !== undefined) parents[e.to].push(e.from)
  })

  let roots = nodes.filter(n => !parents[n.id]?.length).map(n => n.id)
  if (!roots.length) roots = [nodes[0].id]

  const swCache = {}
  function sw(id, vis = new Set()) {
    if (swCache[id] !== undefined) return swCache[id]
    if (vis.has(id)) return NODE_W
    vis.add(id)
    const kids = children[id] || []
    if (!kids.length) { swCache[id] = NODE_W; return NODE_W }
    const w = Math.max(NODE_W, kids.reduce((s, k) => s + sw(k, new Set(vis)) + H_GAP, -H_GAP))
    swCache[id] = w; return w
  }

  const pos = {}
  function place(id, x, y, vis = new Set()) {
    if (vis.has(id)) return
    vis.add(id)
    if (sp[id]) { pos[id] = sp[id] } else { pos[id] = { x, y } }
    const kids = children[id] || []
    if (!kids.length) return
    const totalW = kids.reduce((s, k) => s + sw(k) + H_GAP, -H_GAP)
    let cx = pos[id].x + NODE_W / 2 - totalW / 2
    kids.forEach(k => {
      place(k, cx, pos[id].y + NODE_H + V_GAP, new Set(vis))
      cx += sw(k) + H_GAP
    })
  }

  let xOff = 20
  roots.forEach(r => { place(r, xOff, 20); xOff += sw(r) + H_GAP * 3 })

  let maxY = 20
  Object.values(pos).forEach(p => { if (p.y > maxY) maxY = p.y })
  let oc = 0
  nodes.forEach(n => {
    if (!pos[n.id]) {
      if (sp[n.id]) { pos[n.id] = sp[n.id] } else {
        pos[n.id] = { x: 20 + (oc % 6) * (NODE_W + H_GAP), y: maxY + NODE_H + V_GAP + Math.floor(oc / 6) * (NODE_H + V_GAP) }
        oc++
      }
    }
  })

  const positioned = nodes.map(n => ({ ...n, ...(pos[n.id] || { x: 20, y: 20 }) }))

  const edgeLines = edges.map(e => {
    const f = pos[e.from], t = pos[e.to]
    if (!f || !t) return null
    const isH = !HIER_TYPES.has(e.type)
    let x1, y1, x2, y2, cx1, cy1, cx2, cy2
    if (isH) {
      if (f.x < t.x) { x1 = f.x+NODE_W; y1 = f.y+NODE_H/2; x2 = t.x; y2 = t.y+NODE_H/2 }
      else           { x1 = f.x; y1 = f.y+NODE_H/2; x2 = t.x+NODE_W; y2 = t.y+NODE_H/2 }
      cx1 = x1+(x2-x1)/2; cy1 = y1; cx2 = cx1; cy2 = y2
    } else {
      x1 = f.x+NODE_W/2; y1 = f.y+NODE_H; x2 = t.x+NODE_W/2; y2 = t.y
      const my = (y1+y2)/2; cx1 = x1; cy1 = my; cx2 = x2; cy2 = my
    }
    return { x1, y1, x2, y2, cx1, cy1, cx2, cy2, label: e.label, type: e.type, id: e.id }
  }).filter(Boolean)

  return { positioned, edgeLines }
}

// ── Direction guessing ──────────────────────────────────────────
function guessRelDir(s) {
  const t = (s || '').toLowerCase()
  if (t.includes('married') || t.includes('spouse') || t.includes('husband') || t.includes('wife')) return { type: 'Married', ip: null }
  if (t.includes('half-sibling') || t.includes('half sibling')) return { type: 'Half-sibling', ip: null }
  if (t.includes('sibling') || t.includes('brother') || t.includes('sister')) return { type: 'Sibling', ip: null }
  if (t.includes('cousin')) return { type: 'Cousin', ip: null }
  if (t.includes('grandchild') || t.includes('grandson') || t.includes('granddaughter')) return { type: 'Grandparent/Grandchild', ip: true }
  if (t.includes('grandparent') || t.includes('grandmother') || t.includes('grandfather')) return { type: 'Grandparent/Grandchild', ip: false }
  if (t.includes('niece') || t.includes('nephew')) return { type: 'Aunt/Uncle \u2013 Niece/Nephew', ip: true }
  if (t.includes('aunt') || t.includes('uncle')) return { type: 'Aunt/Uncle \u2013 Niece/Nephew', ip: false }
  if (t.includes('son') || t.includes('daughter') || t.includes('child') || t.includes('born of')) return { type: 'Parent/Child', ip: false }
  if (t.includes('father') || t.includes('mother') || t.includes('parent')) return { type: 'Parent/Child', ip: true }
  return { type: null, ip: null }
}

// ── Merge-aware populate ────────────────────────────────────────
function mergeFromChars(characters, existingNodes, existingEdges) {
  const existingCharIds = new Set(existingNodes.map(n => n.char_id).filter(Boolean))
  const ekeys = new Set(existingEdges.map(e => [e.from, e.to].sort().join('|')))
  const nn = [...existingNodes], ne = [...existingEdges]
  const seen = new Set(existingNodes.map(n => n.id))

  characters.forEach(ch => {
    if (!ch.id || !ch.name || existingCharIds.has(ch.id)) return
    const nid = 'ft_' + ch.id
    if (seen.has(nid)) return
    seen.add(nid); existingCharIds.add(ch.id)
    const tl = (ch.traits || '').toLowerCase()
    let nodeType = 'Other'
    if (tl.includes('praelyn')) nodeType = 'Praelyn'
    else if (tl.includes('queen') || tl.includes('king') || tl.includes('royal')) nodeType = 'Royalty'
    else if (ch.element && ch.element !== '') nodeType = 'Guardian'
    else if (tl.includes('guardian')) nodeType = 'Guardian'
    nn.push({ id: nid, name: ch.display_name || ch.name, birth_year: ch.birthday || '',
      death_year: (ch.notes||'').includes('Deceased: true') ? '\u2020' : '',
      title: '', nodeType, notes: '', char_id: ch.id, image: ch.portrait_canvas || null })
  })

  characters.forEach(ch => {
    const myId = 'ft_' + ch.id
    if (!seen.has(myId)) return
    ;(ch.relationships || []).forEach(rel => {
      const tid = typeof rel === 'string' ? rel : rel.id
      const hint = typeof rel === 'object' ? rel.type : null
      const theirId = 'ft_' + tid
      if (!seen.has(theirId)) return
      const ek = [myId, theirId].sort().join('|')
      if (ekeys.has(ek)) return
      ekeys.add(ek)
      let type = 'Unknown', from = myId, to = theirId
      if (hint) { type = hint } else {
        const tc = characters.find(c => c.id === tid)
        const combined = (ch.traits||'') + ' ' + (ch.notes||'')
        const tname = (tc?.display_name || tc?.name || '').toLowerCase()
        let snippet = ''
        if (tname) { const idx = combined.toLowerCase().indexOf(tname); if (idx >= 0) snippet = combined.slice(Math.max(0,idx-60),idx+100).toLowerCase() }
        const { type: g, ip } = guessRelDir(snippet || combined.toLowerCase())
        if (g) { type = g; if (HIER_TYPES.has(g) && ip === false) { from = theirId; to = myId } }
      }
      ne.push({ id: uid(), from, to, type, label: '' })
    })
  })
  return { nodes: nn, edges: ne }
}

// ── Draggable node ──────────────────────────────────────────────
function TreeNode({ node, selected, editMode, allNodeColors, onClick, onEdit, onDelete, onAddRelation, onDrag }) {
  const col = allNodeColors[node.nodeType] || '#8899bb'
  const dragging = useRef(false)

  function onMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()
    const ox = e.clientX - node.x, oy = e.clientY - node.y
    dragging.current = false
    function onMove(ev) {
      dragging.current = true
      onDrag(node.id, Math.max(0, ev.clientX - ox), Math.max(0, ev.clientY - oy))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{
      position: 'absolute', left: node.x, top: node.y, width: 160, minHeight: 72,
      background: 'var(--card)',
      border: `2px solid ${selected ? col : 'var(--brd)'}`,
      borderRadius: 8, padding: '6px 8px',
      cursor: editMode ? 'grab' : 'pointer',
      boxShadow: selected ? `0 0 12px ${col}55` : '0 2px 6px rgba(0,0,0,.4)',
      userSelect: 'none', zIndex: selected ? 10 : 1,
    }}
      onClick={e => { e.stopPropagation(); if (!dragging.current) onClick(node.id) }}
      onMouseDown={editMode ? onMouseDown : undefined}
    >
      {node.image && <img src={node.image} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', float: 'right', marginLeft: 6, marginBottom: 3, border: `2px solid ${col}` }} />}
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Cinzel', serif", color: col, lineHeight: 1.3, marginBottom: 1 }}>{node.name}</div>
      {node.birth_year && <div style={{ fontSize: 9, color: 'var(--dim)' }}>{node.birth_year}{node.death_year ? ` \u2013 ${node.death_year}` : ''}</div>}
      {node.title && <div style={{ fontSize: 9, color: 'var(--mut)', fontStyle: 'italic' }}>{node.title}</div>}
      {selected && editMode && (
        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
          <button style={bs(col)} onClick={e => { e.stopPropagation(); onEdit(node) }}>✎ Edit</button>
          <button style={bs('var(--cca)')} onClick={e => { e.stopPropagation(); onAddRelation(node) }}>+ Link</button>
          <button style={bs('#ff3355')} onClick={e => { e.stopPropagation(); onDelete(node.id) }}>✕</button>
        </div>
      )}
    </div>
  )
}
const bs = col => ({ background: 'none', border: `1px solid ${col}44`, color: col, fontSize: 9, cursor: 'pointer', padding: '1px 5px', borderRadius: 3 })

// ── Main component ──────────────────────────────────────────────
export default function FamilyTree({ db }) {
  const raw = (db.db.family_tree || [{ id: '_root', nodes: [], edges: [], bg_color: '#060608', bg_image: null }])[0]

  const [nodes,    setNodes]    = useState(raw.nodes || [])
  const [edges,    setEdges]    = useState(raw.edges || [])
  const [nodePos,  setNodePos]  = useState({})
  const [bgColor,  setBgColor]  = useState(raw.bg_color || '#060608')
  const [bgImage,  setBgImage]  = useState(raw.bg_image || null)
  const [sel,      setSel]      = useState(null)
  const [nodeModal,setNodeModal]= useState(null)
  const [edgeModal,setEdgeModal]= useState(null)
  const [editMode, setEditMode] = useState(false)
  const [clearDlg, setClearDlg] = useState(false)
  const [showUnk,  setShowUnk]  = useState(false)
  const [zoom,     setZoom]     = useState(1)
  const [pan,      setPan]      = useState({ x: 0, y: 0 })
  const [panning,  setPanning]  = useState(false)
  const panRef = useRef(null)
  const bgRef  = useRef()

  const customEdgeTypes  = Array.isArray(db.db.custom_edge_types)  ? db.db.custom_edge_types  : []
  const customNodeTypes  = Array.isArray(db.db.custom_node_types)  ? db.db.custom_node_types  : []
  const customEdgeColors = (typeof db.db.custom_edge_colors === 'object' && db.db.custom_edge_colors) ? db.db.custom_edge_colors : {}
  const customNodeColors = (typeof db.db.custom_node_colors === 'object' && db.db.custom_node_colors) ? db.db.custom_node_colors : {}

  const allEdgeTypes  = [...BUILTIN_EDGE_TYPES,  ...customEdgeTypes.filter(t => !BUILTIN_EDGE_TYPES.includes(t))]
  const allNodeTypes  = [...BUILTIN_NODE_TYPES,  ...customNodeTypes.filter(t => !BUILTIN_NODE_TYPES.includes(t))]
  const allEdgeColors = { ...BUILTIN_EDGE_COLORS, ...customEdgeColors }
  const allNodeColors = { ...NODE_TYPE_COLORS,   ...customNodeColors }

  // Merge stored positions from node data + live drag overrides
  const sp = {}
  nodes.forEach(n => { if (n.x !== undefined && n.y !== undefined) sp[n.id] = { x: n.x, y: n.y } })
  Object.assign(sp, nodePos)

  const { positioned, edgeLines } = buildLayout(nodes, edges, sp)
  const maxX = Math.max(800,  ...positioned.map(n => n.x + 200))
  const maxY = Math.max(500,  ...positioned.map(n => n.y + 140))
  const unknownEdges = edges.filter(e => e.type === 'Unknown')

  // ── Persist ─────────────────────────────────────────────────
  function persist(nn, ne, bg, bi) {
    const merged = { ...sp, ...nodePos }
    const nodesToSave = (nn ?? nodes).map(n => { const p = merged[n.id]; return p ? { ...n, x: p.x, y: p.y } : n })
    db.upsertEntry('family_tree', { id: '_root', name: 'Family Tree', nodes: nodesToSave, edges: ne ?? edges, bg_color: bg ?? bgColor, bg_image: bi !== undefined ? bi : bgImage })
  }

  function saveCustom(et, nt, ec, nc) {
    if (et !== undefined) db.upsertEntry('custom_edge_types', et)
    if (nt !== undefined) db.upsertEntry('custom_node_types', nt)
    if (ec !== undefined) db.upsertEntry('custom_edge_colors', ec)
    if (nc !== undefined) db.upsertEntry('custom_node_colors', nc)
  }

  // ── Node CRUD ────────────────────────────────────────────────
  function saveNode(node) {
    const isNew = !node.id || !nodes.find(n => n.id === node.id)
    const nn = isNew ? [...nodes, { ...node, id: node.id || uid() }] : nodes.map(n => n.id === node.id ? node : n)
    setNodes(nn); persist(nn, null, null, undefined); setNodeModal(null)
  }
  function deleteNode(id) {
    const nn = nodes.filter(n => n.id !== id), ne = edges.filter(e => e.from !== id && e.to !== id)
    setNodes(nn); setEdges(ne); persist(nn, ne, null, undefined); setSel(null)
  }
  function handleDrag(id, x, y) {
    setNodePos(p => ({ ...p, [id]: { x, y } }))
  }
  // Save after drag ends (called from TreeNode onMouseUp equivalent — we use a timer approach)
  const dragSaveTimer = useRef(null)
  function onDragMove(id, x, y) {
    handleDrag(id, x, y)
    clearTimeout(dragSaveTimer.current)
    dragSaveTimer.current = setTimeout(() => {
      setNodePos(prev => {
        const updated = { ...prev, [id]: { x, y } }
        const nodesToSave = nodes.map(n => { const p = updated[n.id]; return p ? { ...n, x: p.x, y: p.y } : n })
        db.upsertEntry('family_tree', { id: '_root', name: 'Family Tree', nodes: nodesToSave, edges, bg_color: bgColor, bg_image: bgImage })
        return updated
      })
    }, 400)
  }

  // ── Edge CRUD ────────────────────────────────────────────────
  function saveEdge(edge) {
    if (edge._customType?.trim()) {
      const ct = edge._customType.trim(), cc = edge._customColor || '#aaaaaa'
      edge.type = ct
      if (!allEdgeTypes.includes(ct)) saveCustom([...customEdgeTypes, ct], undefined, { ...customEdgeColors, [ct]: cc }, undefined)
    }
    delete edge._customType; delete edge._customColor
    const exists = edge.id && edges.find(e => e.id === edge.id)
    const ne = exists ? edges.map(e => e.id === edge.id ? edge : e) : [...edges, { ...edge, id: edge.id || uid() }]
    setEdges(ne); persist(null, ne, null, undefined); setEdgeModal(null)
  }
  function deleteEdge(id) {
    const ne = edges.filter(e => e.id !== id)
    setEdges(ne); persist(null, ne, null, undefined); setEdgeModal(null)
  }

  // ── Sync ────────────────────────────────────────────────────
  function syncChars() {
    const chars = db.db.characters || []
    if (!chars.length) { alert('No characters found.'); return }
    const { nodes: nn, edges: ne } = mergeFromChars(chars, nodes, edges)
    setNodes(nn); setEdges(ne); persist(nn, ne, null, undefined)
  }

  // ── Zoom / Pan ───────────────────────────────────────────────
  function onWheel(e) { e.preventDefault(); setZoom(z => Math.max(0.25, Math.min(3, z - e.deltaY * 0.001))) }
  function onBgDown(e) {
    if (e.button !== 0) return
    setPanning(true); panRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    setSel(null); setEdgeModal(null)
  }
  function onBgMove(e) { if (panning && panRef.current) setPan({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y }) }
  function onBgUp() { setPanning(false); panRef.current = null }

  function clearTree() { setNodes([]); setEdges([]); setNodePos({}); persist([], [], null, null); setClearDlg(false); setSel(null) }

  const UNK_COL = BUILTIN_EDGE_COLORS.Unknown

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="tbar" style={{ flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: 'var(--cl)' }}>🌳 Family Tree</div>
        <button className="btn btn-sm btn-outline" style={{ color: editMode ? 'var(--cc)' : 'var(--dim)', borderColor: editMode ? 'var(--cc)' : 'var(--brd)' }} onClick={() => setEditMode(v => !v)}>
          {editMode ? '✓ Editing' : '✎ Edit Mode'}
        </button>
        {editMode && <>
          <button className="btn btn-primary btn-sm" style={{ background: 'var(--cc)' }} onClick={() => setNodeModal({})}>+ Person</button>
          <button className="btn btn-sm btn-outline" style={{ color: 'var(--cca)', borderColor: 'var(--cca)' }} onClick={() => setEdgeModal({})}>+ Relation</button>
        </>}
        <button className="btn btn-sm btn-outline" style={{ color: 'var(--cl)', borderColor: 'var(--cl)' }} onClick={syncChars} title="Adds new characters without removing existing edits">
          ⟳ Sync Characters
        </button>
        {unknownEdges.length > 0 && (
          <button className="btn btn-sm btn-outline" style={{ color: UNK_COL, borderColor: UNK_COL + '88', fontWeight: 700 }} onClick={() => setShowUnk(v => !v)}>
            ⚠ {unknownEdges.length} Unknown{unknownEdges.length > 1 ? 's' : ''}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <button style={bs('var(--dim)')} onClick={() => setZoom(z => Math.max(0.25, z - 0.15))}>−</button>
          <span style={{ fontSize: 9, color: 'var(--cca)', minWidth: 32, textAlign: 'center' }}>{Math.round(zoom*100)}%</span>
          <button style={bs('var(--dim)')} onClick={() => setZoom(z => Math.min(3, z + 0.15))}>+</button>
          <button style={bs('var(--mut)')} onClick={() => { setZoom(1); setPan({ x:0, y:0 }) }} title="Reset view">⊙</button>
        </div>
        {nodes.length > 0 && editMode && <button className="btn btn-sm btn-outline" style={{ color: '#ff3355', borderColor: '#ff335544' }} onClick={() => setClearDlg(true)}>🗑 Clear</button>}
      </div>

      {/* ── BG controls ── */}
      {editMode && (
        <div className="tbar" style={{ paddingTop: 0, gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
            BG: <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); persist(null,null,e.target.value,undefined) }} style={{ width:26, height:20, padding:0, border:'1px solid var(--brd)', borderRadius:3, cursor:'pointer' }} />
          </span>
          <label style={{ fontSize:10, color:'var(--dim)', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            🖼 BG: <input ref={bgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setBgImage(ev.target.result);persist(null,null,null,ev.target.result)};r.readAsDataURL(f) }} />
            <span style={{ color:'var(--cc)', textDecoration:'underline' }}>Upload</span>
          </label>
          {bgImage && <button className="btn btn-sm btn-outline" style={{ color:'#ff3355', borderColor:'#ff335544', fontSize:9 }} onClick={() => { setBgImage(null); persist(null,null,null,null) }}>Remove BG</button>}
          <span style={{ fontSize:9, color:'var(--mut)' }}>Drag nodes to reposition · Scroll to zoom · Drag background to pan</span>
        </div>
      )}

      {/* ── Unknown panel ── */}
      {showUnk && unknownEdges.length > 0 && (
        <div style={{ margin:'4px 0', padding:10, background:`${UNK_COL}11`, border:`1px solid ${UNK_COL}44`, borderRadius:6 }}>
          <div style={{ fontSize:10, color:UNK_COL, fontWeight:700, marginBottom:6 }}>⚠ Unknown Relationships — click any to edit:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {unknownEdges.map(e => {
              const fn = nodes.find(n => n.id===e.from), tn = nodes.find(n => n.id===e.to)
              return <button key={e.id} style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'var(--card)', border:`1px solid ${UNK_COL}66`, color:UNK_COL, cursor:'pointer' }} onClick={() => { setEdgeModal(e); setShowUnk(false) }}>{fn?.name||'?'} ↔ {tn?.name||'?'}</button>
            })}
          </div>
        </div>
      )}

      {/* ── Empty ── */}
      {!nodes.length && (
        <div className="empty">
          <div className="empty-icon">🌳</div>
          <p>No family tree yet.</p>
          <p style={{ fontSize:11, color:'var(--mut)', maxWidth:340, margin:'6px auto 14px' }}>
            Click <strong>⟳ Sync Characters</strong> to auto-populate, or add people manually in Edit Mode.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" style={{ background:'var(--cl)', color:'#000' }} onClick={syncChars}>⟳ Sync Characters</button>
            <button className="btn btn-outline" style={{ color:'var(--cc)', borderColor:'var(--cc)' }} onClick={() => { setEditMode(true); setNodeModal({}) }}>+ Add Manually</button>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      {nodes.length > 0 && (
        <div style={{ overflow:'hidden', maxHeight:'72vh', minHeight:300, border:'1px solid var(--brd)', borderRadius:'var(--rl)', background: bgImage ? `url(${bgImage}) center/cover` : bgColor, position:'relative', cursor: panning ? 'grabbing' : 'default' }}
          onWheel={onWheel} onMouseDown={onBgDown} onMouseMove={onBgMove} onMouseUp={onBgUp} onMouseLeave={onBgUp}>
          <div style={{ transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:'0 0', position:'relative', width:maxX, height:maxY }}>
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible' }}>
              <defs>
                {allEdgeTypes.map(t => {
                  const c = allEdgeColors[t]||'#666688', sid = t.replace(/[^a-zA-Z0-9]/g,'')
                  return <marker key={t} id={`a-${sid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={c} opacity="0.75" /></marker>
                })}
              </defs>
              {edgeLines.map((line, i) => {
                const c = allEdgeColors[line.type]||'#666688', isUnk = line.type==='Unknown'
                const sid = (line.type||'').replace(/[^a-zA-Z0-9]/g,'')
                const mx = (line.x1+line.x2)/2, my = (line.y1+line.y2)/2
                return (
                  <g key={i} style={{ pointerEvents:'all', cursor: editMode ? 'pointer' : 'default' }}
                    onClick={e => { e.stopPropagation(); if (editMode) setEdgeModal(edges.find(ed=>ed.id===line.id)) }}>
                    <path d={`M ${line.x1} ${line.y1} C ${line.cx1} ${line.cy1}, ${line.cx2} ${line.cy2}, ${line.x2} ${line.y2}`} stroke="transparent" strokeWidth={14} fill="none" />
                    <path d={`M ${line.x1} ${line.y1} C ${line.cx1} ${line.cy1}, ${line.cx2} ${line.cy2}, ${line.x2} ${line.y2}`}
                      stroke={c} strokeWidth={isUnk ? 2.5 : 1.5} fill="none" opacity={isUnk ? 1 : 0.75}
                      strokeDasharray={isUnk ? '6,4' : undefined}
                      markerEnd={`url(#a-${sid})`} />
                    <text x={mx} y={my-5} textAnchor="middle" fontSize={8} fill={c} opacity={isUnk?1:0.85} style={{ pointerEvents:'none' }}>{line.label || line.type}</text>
                  </g>
                )
              })}
            </svg>
            {positioned.map(node => (
              <TreeNode key={node.id} node={node} selected={sel===node.id} editMode={editMode} allNodeColors={allNodeColors}
                onClick={id => setSel(sel===id ? null : id)}
                onEdit={n => setNodeModal(n)}
                onDelete={deleteNode}
                onAddRelation={n => setEdgeModal({ from: n.id })}
                onDrag={onDragMove}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {nodes.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'6px 0', fontSize:9, color:'var(--dim)' }}>
          {allEdgeTypes.map(t => {
            const c = allEdgeColors[t]||'#666688', isUnk = t==='Unknown', cnt = isUnk ? unknownEdges.length : 0
            return (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:3 }}>
                <div style={{ width:16, height:2, background:c, borderRadius:1, opacity:isUnk?1:0.8 }} />
                <span style={{ color: isUnk && cnt > 0 ? c : undefined, fontWeight: isUnk && cnt > 0 ? 700 : undefined }}>
                  {t}{isUnk && cnt > 0 ? ` (${cnt})` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {nodes.length > 0 && (
        <div style={{ fontSize:9, color:'var(--mut)', paddingBottom:4 }}>
          {nodes.length} people · {edges.length} relationships
          {unknownEdges.length > 0 && <span style={{ color:UNK_COL, marginLeft:8, fontWeight:700 }}>· {unknownEdges.length} Unknown — click ⚠ to review</span>}
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={!!nodeModal} onClose={() => setNodeModal(null)} title={nodeModal?.id ? 'Edit Person' : 'Add Person'} color="var(--cl)">
        {nodeModal && <NodeForm node={nodeModal} onSave={saveNode} onCancel={() => setNodeModal(null)} db={db} nodeTypes={allNodeTypes}
          onAddNodeType={t => saveCustom(undefined, [...customNodeTypes, t], undefined, undefined)} />}
      </Modal>
      <Modal open={!!edgeModal} onClose={() => setEdgeModal(null)} title={edgeModal?.id ? 'Edit Relation' : 'Add Relation'} color="var(--cca)">
        {edgeModal && <EdgeForm edge={edgeModal} nodes={nodes} onSave={saveEdge}
          onDelete={edgeModal.id ? deleteEdge : null}
          onCancel={() => setEdgeModal(null)}
          edgeTypes={allEdgeTypes} edgeColors={allEdgeColors}
          onAddEdgeType={(t,c) => saveCustom([...customEdgeTypes,t], undefined, {...customEdgeColors,[t]:c}, undefined)} />}
      </Modal>
      <Modal open={clearDlg} onClose={() => setClearDlg(false)} title="Clear Family Tree" color="#ff3355">
        <p style={{ fontSize:12, color:'var(--dim)', marginBottom:16 }}>Remove all {nodes.length} people and {edges.length} relationships? Cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setClearDlg(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background:'#ff3355' }} onClick={clearTree}>Clear Tree</button>
        </div>
      </Modal>
    </div>
  )
}

// ── Node form ───────────────────────────────────────────────────
function NodeForm({ node, onSave, onCancel, db, nodeTypes, onAddNodeType }) {
  const [form, setForm] = useState({ name:'', birth_year:'', death_year:'', title:'', nodeType:'Other', notes:'', ...node })
  const [image, setImage] = useState(node.image||null)
  const [customType, setCustomType] = useState('')
  const s = k => e => setForm(p => ({...p,[k]:e.target.value}))
  const chars = db.db.characters||[]

  function handleSave() {
    if (!form.name.trim()) { alert('Name is required.'); return }
    let ft = form.nodeType
    if (ft==='__custom__' && customType.trim()) { ft=customType.trim(); onAddNodeType(ft) }
    onSave({...form, nodeType:ft, image})
  }

  return (
    <>
      <div className="field"><label>Link to Character (optional)</label>
        <select value={form.char_id||''} onChange={e => {
          const ch=chars.find(c=>c.id===e.target.value)
          setForm(p=>({...p,char_id:e.target.value,name:ch?(ch.display_name||ch.name):p.name,birth_year:ch?.birthday||p.birth_year}))
          if (ch?.portrait_canvas) setImage(ch.portrait_canvas)
        }}>
          <option value="">— None —</option>
          {chars.map(c=><option key={c.id} value={c.id}>{c.display_name||c.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Name *</label><input value={form.name} onChange={s('name')} /></div>
      <div className="field-row">
        <div className="field"><label>Birth Year</label><input value={form.birth_year} onChange={s('birth_year')} placeholder="e.g. 1517 or HC 1" /></div>
        <div className="field"><label>Death Year</label><input value={form.death_year} onChange={s('death_year')} placeholder="blank if living" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Title / Role</label><input value={form.title} onChange={s('title')} placeholder="e.g. Queen of Lurlen" /></div>
        <div className="field"><label>Type</label>
          <select value={form.nodeType} onChange={s('nodeType')}>
            {nodeTypes.map(t=><option key={t} value={t}>{t}</option>)}
            <option value="__custom__">+ Add new type…</option>
          </select>
          {form.nodeType==='__custom__' && <input style={{marginTop:4}} value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g. The Rebels" />}
        </div>
      </div>
      <div className="field"><label>Portrait Image</label>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {image && <img src={image} alt="" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--brd)'}} />}
          <label style={{cursor:'pointer',fontSize:11,color:'var(--cc)',textDecoration:'underline'}}>
            {image?'Change':'Upload photo'}
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setImage(ev.target.result);r.readAsDataURL(f)}} />
          </label>
          {image && <button style={{background:'none',border:'none',color:'#ff3355',cursor:'pointer',fontSize:11}} onClick={()=>setImage(null)}>Remove</button>}
        </div>
      </div>
      <div className="field"><label>Notes</label><textarea value={form.notes} onChange={s('notes')} /></div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{background:'var(--cl)',color:'#000'}} onClick={handleSave}>{node.id?'Save Changes':'Add Person'}</button>
      </div>
    </>
  )
}

// ── Edge form ───────────────────────────────────────────────────
function EdgeForm({ edge, nodes, onSave, onDelete, onCancel, edgeTypes, edgeColors, onAddEdgeType }) {
  const [form, setForm] = useState({ from:'', to:'', type:'Parent/Child', label:'', ...edge })
  const [customType, setCustomType] = useState('')
  const [customColor, setCustomColor] = useState('#aaaaaa')
  const s = k => e => setForm(p => ({...p,[k]:e.target.value}))

  const dirNote = {
    'Parent/Child':'"From" = PARENT · "To" = CHILD',
    'Grandparent/Grandchild':'"From" = GRANDPARENT · "To" = GRANDCHILD',
    'Adoptive Parent/Child':'"From" = ADOPTIVE PARENT · "To" = CHILD',
    'Step-parent/Step-child':'"From" = STEP-PARENT · "To" = STEP-CHILD',
    'Aunt/Uncle \u2013 Niece/Nephew':'"From" = AUNT/UNCLE · "To" = NIECE/NEPHEW',
    'Half-aunt/Half-uncle \u2013 Niece/Nephew':'"From" = HALF-AUNT/UNCLE · "To" = NIECE/NEPHEW',
    'Guardian/Ward':'"From" = GUARDIAN · "To" = WARD',
    'Reincarnation':'"From" = PREVIOUS LIFE · "To" = CURRENT LIFE',
  }[form.type]

  const previewCol = edgeColors[form.type] || customColor

  return (
    <>
      <div className="field-row">
        <div className="field"><label>From *</label>
          <select value={form.from} onChange={s('from')}><option value="">— Pick person —</option>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select>
        </div>
        <div className="field"><label>To *</label>
          <select value={form.to} onChange={s('to')}><option value="">— Pick person —</option>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select>
        </div>
      </div>
      <div className="field"><label>Relationship Type</label>
        <select value={form.type} onChange={s('type')}>
          {edgeTypes.map(t=><option key={t} value={t}>{t}</option>)}
          <option value="__custom__">+ Add new type…</option>
        </select>
        {form.type==='__custom__' && (
          <div style={{display:'flex',gap:8,marginTop:4,alignItems:'center'}}>
            <input style={{flex:1}} value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g. Ix'Citlatl Member, The Rebels" />
            <span style={{fontSize:9,color:'var(--dim)'}}>Color:</span>
            <input type="color" value={customColor} onChange={e=>setCustomColor(e.target.value)} style={{width:28,height:22,padding:0,border:'1px solid var(--brd)',borderRadius:3,cursor:'pointer'}} />
          </div>
        )}
        {dirNote && <div style={{fontSize:9,color:'var(--cca)',marginTop:3}}>{dirNote}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <div style={{width:24,height:3,background:previewCol,borderRadius:2}} />
        <span style={{fontSize:9,color:previewCol}}>{form.type!=='__custom__'?form.type:customType||'Custom'}</span>
      </div>
      <div className="field">
        <label>Custom Label <span style={{color:'var(--mut)',fontWeight:400}}>(optional — overrides type name on the line)</span></label>
        <input value={form.label} onChange={s('label')} placeholder="Leave blank to show type name" />
      </div>
      <div className="modal-actions">
        {onDelete && <button className="btn btn-outline" style={{color:'#ff3355',borderColor:'#ff335544',marginRight:'auto'}} onClick={()=>onDelete(form.id)}>Delete Relation</button>}
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{background:'var(--cca)'}} onClick={() => {
          if (!form.from||!form.to) { alert('Select both people.'); return }
          if (form.from===form.to) { alert('Cannot link a person to themselves.'); return }
          if (form.type==='__custom__') {
            if (!customType.trim()) { alert('Enter a name for the custom type.'); return }
            onAddEdgeType(customType.trim(), customColor)
            onSave({...form,_customType:customType.trim(),_customColor:customColor})
          } else { onSave(form) }
        }}>{edge.id?'Save Changes':'Add Relation'}</button>
      </div>
    </>
  )
}
