import { supabase, hasSupabase } from '../../supabase'
import { useRef, useState } from 'react'

// ── Merge helper ─────────────────────────────────────────────────
// Merges imported JSON into existing db without overwriting anything.
// For each category: keeps existing entries, adds new ones by ID.
// Family tree is merged specially — nodes/edges merged by ID.
function mergeImport(existing, incoming) {
  const result = {}
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)])

  allKeys.forEach(key => {
    const ex = existing[key] ?? []
    const inc = incoming[key] ?? []

    // Special case: family_tree is an array with one root object
    if (key === 'family_tree') {
      const exRoot = ex[0] || { id: '_root', nodes: [], edges: [] }
      const incRoot = inc[0]
      if (!incRoot) { result[key] = ex; return }

      const exNodeIds = new Set((exRoot.nodes || []).map(n => n.id))
      const exEdgeIds = new Set((exRoot.edges || []).map(e => e.id))

      const mergedNodes = [
        ...(exRoot.nodes || []),
        ...(incRoot.nodes || []).filter(n => !exNodeIds.has(n.id))
      ]
      const mergedEdges = [
        ...(exRoot.edges || []),
        ...(incRoot.edges || []).filter(e => !exEdgeIds.has(e.id))
      ]

      result[key] = [{
        ...exRoot,
        ...incRoot,
        nodes: mergedNodes,
        edges: mergedEdges,
        // preserve custom types from both
        custom_edge_types: [
          ...new Set([
            ...(exRoot.custom_edge_types || []),
            ...(incRoot.custom_edge_types || [])
          ])
        ],
        custom_node_types: [
          ...new Set([
            ...(exRoot.custom_node_types || []),
            ...(incRoot.custom_node_types || [])
          ])
        ],
        custom_edge_colors: { ...(exRoot.custom_edge_colors || {}), ...(incRoot.custom_edge_colors || {}) },
        custom_node_colors: { ...(exRoot.custom_node_colors || {}), ...(incRoot.custom_node_colors || {}) },
      }]
      return
    }

    // All other categories: arrays of objects with id fields
    if (!Array.isArray(ex) || !Array.isArray(inc)) {
      result[key] = ex || inc
      return
    }

    const existingIds = new Set(ex.map(e => e.id).filter(Boolean))
    const newEntries = inc.filter(e => e.id && !existingIds.has(e.id))
    result[key] = [...ex, ...newEntries]
  })

  return result
}

export default function IOBar({ db, backup }) {
  const importRef = useRef()
  const asterRef = useRef()
  const [msg, setMsg] = useState('')
  const [asterModal, setAsterModal] = useState(null)
  const [mdModal, setMdModal] = useState(false)

  const MD_CATS = [
    { k: 'canon',      l: 'Canon Decisions' },
    { k: 'characters', l: 'Characters' },
    { k: 'world',      l: 'World' },
    { k: 'questions',  l: 'Questions' },
    { k: 'flags',      l: 'Flags' },
    { k: 'spellings',  l: 'Spellings' },
    { k: 'locations',  l: 'Locations' },
    { k: 'items',      l: 'Items' },
    { k: 'wardrobe',   l: 'Wardrobe' },
    { k: 'inventory',  l: 'Inventory' },
    { k: 'scenes',     l: 'Scenes' },
    { k: 'timeline',   l: 'Timeline' },
    { k: 'wiki',       l: 'Wiki' },
    { k: 'notes',      l: 'Notes' },
    { k: 'manuscript', l: 'Manuscript' },
  ]
  const [mdSelected, setMdSelected] = useState(() => new Set(['canon','characters','world','questions','flags','spellings']))

  function flash(text, ms = 2500) {
    setMsg(text)
    setTimeout(() => setMsg(''), ms)
  }

  // ── Merge import ─────────────────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const incoming = JSON.parse(ev.target.result)

        // ── Session log entries route to session_log table ──
        let sessionLogAdded = 0
        if (incoming.session_log && Array.isArray(incoming.session_log)) {
          const { supabase, hasSupabase } = await import('../../supabase').catch(() => ({}))
          if (hasSupabase && supabase) {
            for (const entry of incoming.session_log) {
              if (!entry?.id) continue
              const { error } = await supabase.from('session_log').upsert(entry, { onConflict: 'id', ignoreDuplicates: true })
              if (!error) sessionLogAdded++
            }
          }
          delete incoming.session_log
        }

        const merged = mergeImport(db.db, incoming)

        // Count new entries
        let added = 0
        Object.keys(merged).forEach(k => {
          const exLen = (db.db[k] || []).length
          const newLen = (merged[k] || []).length
          added += Math.max(0, newLen - exLen)
        })

        // session_log goes to its own Supabase table, matched by session_number
        if (incoming.session_log && Array.isArray(incoming.session_log)) {
          for (const session of incoming.session_log) {
            if (!session.id) continue
            if (hasSupabase) {
              // Upsert by session_number if it exists, otherwise by id
              await supabase.from('session_log').upsert(session, {
                onConflict: session.session_number != null ? 'session_number' : 'id'
              })
            }
            added++
          }
        }

        // Write merged data back via upsert for each category
        const upsertPromises = []
        Object.keys(merged).forEach(k => {
          const arr = merged[k]
          if (!Array.isArray(arr)) return
          if (k === 'family_tree') {
            if (arr[0]) upsertPromises.push(db.upsertEntry('family_tree', arr[0]))
            return
          }
          arr.forEach(entry => {
            if (entry?.id) upsertPromises.push(db.upsertEntry(k, entry))
          })
        })
        await Promise.all(upsertPromises)

        const parts = []
        if (added > 0) parts.push(`${added} compendium entries`)
        if (sessionLogAdded > 0) parts.push(`${sessionLogAdded} session log entries`)
        flash(`✓ Merged: ${parts.length ? parts.join(' + ') : 'nothing new'} added`)
      } catch (err) {
        flash(`✗ Import failed: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleAster(e) {
    const file = e.target.files[0]
    if (!file) return
    // Show merge/overwrite choice modal
    setAsterModal(file)
    e.target.value = ''
  }

  async function doAsterImport(mode) {
    const file = asterModal
    setAsterModal(null)
    if (!file) return
    try {
      if (mode === 'overwrite') {
        const count = await db.importAster(file)
        flash(`✓ Replaced with ${count} entries from Aster`)
      } else {
        // merge: read file, use same mergeImport logic
        const text = await file.text()
        const incoming = JSON.parse(text)
        const merged = mergeImport(db.db, incoming)
        let added = 0
        Object.keys(merged).forEach(k => {
          const exLen = (db.db[k] || []).length
          const newLen = (merged[k] || []).length
          added += Math.max(0, newLen - exLen)
        })
        const upsertPromises = []
        Object.keys(merged).forEach(k => {
          const arr = merged[k]
          if (!Array.isArray(arr)) return
          if (k === 'family_tree') {
            if (arr[0]) upsertPromises.push(db.upsertEntry('family_tree', arr[0]))
            return
          }
          arr.forEach(entry => {
            if (entry?.id) upsertPromises.push(db.upsertEntry(k, entry))
          })
        })
        await Promise.all(upsertPromises)
        flash(`✓ Aster merged: ${added} new entries added`)
      }
    } catch (err) {
      flash(`✗ Aster import failed: ${err.message}`)
    }
  }

  async function handleBackup() {
    flash('Backing up…')
    const result = await backup.doBackup(db.db, false)
    if (result.success) flash(`✓ Backed up: ${result.filename}`)
    else if (result.reason === 'not_configured') flash('⚠ Google Drive not configured')
    else flash(`✗ Backup failed: ${result.reason}`)
  }

  return (
    <>
      {/* ── Aster import mode modal ── */}
      {asterModal && (
        <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,.8)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--sf)', border:'1px solid var(--brd)', borderRadius:12,
            padding:20, maxWidth:340, width:'100%', textAlign:'center' }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:13, marginBottom:8, color:'var(--cca)' }}>
              ⬆ Aster Import
            </div>
            <p style={{ fontSize:11, color:'var(--dim)', marginBottom:16, lineHeight:1.5 }}>
              <strong style={{ color:'var(--tx)' }}>{asterModal.name}</strong><br/>
              How do you want to import this?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
              <button className="btn btn-primary btn-sm" style={{ background:'var(--cl)', color:'#000', padding:'8px 14px', fontSize:11 }}
                onClick={() => doAsterImport('merge')}>
                Merge — add new entries, keep existing
              </button>
              <button className="btn btn-outline btn-sm" style={{ color:'var(--ccn)', borderColor:'var(--ccn)44', padding:'8px 14px', fontSize:11 }}
                onClick={() => doAsterImport('overwrite')}>
                Replace — overwrite with Aster data
              </button>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setAsterModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Export .md modal ── */}
      {mdModal && (
        <div className="modal-overlay open" onClick={() => setMdModal(false)}>
          <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMdModal(false)}>✕</button>
            <h2 className="modal-title" style={{ color: 'var(--csc)' }}>↓ Export .md</h2>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14, lineHeight: 1.5 }}>
              Choose which categories to include in your markdown export.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {MD_CATS.map(({ k, l }) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, color: 'var(--tx)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={mdSelected.has(k)}
                    onChange={e => setMdSelected(prev => {
                      const next = new Set(prev)
                      e.target.checked ? next.add(k) : next.delete(k)
                      return next
                    })} />
                  {l}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline"
                onClick={() => setMdSelected(new Set(MD_CATS.map(c => c.k)))}>
                All
              </button>
              <button className="btn btn-sm btn-outline"
                onClick={() => setMdSelected(new Set())}>
                None
              </button>
              <button className="btn btn-primary btn-sm" style={{ background: 'var(--csc)', color: '#000' }}
                onClick={() => {
                  if (mdSelected.size === 0) return
                  db.exportMarkdown([...mdSelected])
                  setMdModal(false)
                }}>
                Export {mdSelected.size > 0 ? `(${mdSelected.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="iobar">
        {msg && (
          <span style={{ fontSize: 10, color: 'var(--sl)', marginRight: 8 }}>{msg}</span>
        )}

        <button className="btn btn-sm btn-outline" onClick={db.exportJSON}>⬇ Export JSON</button>
        <button className="btn btn-sm btn-outline" onClick={() => setMdModal(true)}>⬇ Export .md</button>

        <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}
          title="Merges with existing data — new entries added, existing entries preserved">
          ⬆ Import (merge)
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>

        <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
          ⬆ Aster Import
          <input ref={asterRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleAster} />
        </label>

        <button className="btn btn-sm btn-outline" onClick={db.exportAster}>⬇ Aster Export</button>

        <button className="btn btn-sm btn-outline" onClick={db.exportCSV || (() => {})}>📋 CSV</button>

        {backup?.isConfigured && (
          <button className="btn btn-sm btn-outline" onClick={handleBackup}
            title={`Last backup: ${backup.lastBackup || 'never'}`}>
            ☁ Backup
          </button>
        )}

        <button
          className="btn btn-sm btn-outline"
          style={{ color: '#ff3355', borderColor: '#ff335544' }}
          onClick={() => {
            if (confirm('Clear all data? This cannot be undone.')) {
              // selective clear modal — pending
            }
          }}
        >
          🗑 Clear
        </button>

        <span style={{ fontSize: 9, color: 'var(--mut)', marginLeft: 4 }}>
          <span className={`sync-dot ${db.syncStatus}`} style={{ marginRight: 3 }} />
          {db.hasSupabase ? 'Cloud sync on' : 'Local only'}
        </span>
      </div>
    </>
  )
}
