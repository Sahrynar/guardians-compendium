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
        const merged = mergeImport(db.db, incoming)

        // Count new entries
        let added = 0
        Object.keys(merged).forEach(k => {
          const exLen = (db.db[k] || []).length
          const newLen = (merged[k] || []).length
          added += Math.max(0, newLen - exLen)
        })

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

        flash(`✓ Merged: ${added} new entries added`)
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
    try {
      const count = await db.importAster(file)
      flash(`✓ Imported ${count} entries from Aster`)
    } catch (err) {
      flash(`✗ Aster import failed: ${err.message}`)
    }
    e.target.value = ''
  }

  async function handleBackup() {
    flash('Backing up…')
    const result = await backup.doBackup(db.db, false)
    if (result.success) flash(`✓ Backed up: ${result.filename}`)
    else if (result.reason === 'not_configured') flash('⚠ Google Drive not configured')
    else flash(`✗ Backup failed: ${result.reason}`)
  }

  return (
    <div className="iobar">
      {msg && (
        <span style={{ fontSize: 10, color: 'var(--sl)', marginRight: 8 }}>{msg}</span>
      )}

      <button className="btn btn-sm btn-outline" onClick={db.exportJSON}>⬇ Export</button>

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
  )
}
