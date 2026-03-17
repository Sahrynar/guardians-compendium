import { useRef, useState } from 'react'

export default function IOBar({ db, backup }) {
  const importRef = useRef()
  const asterRef = useRef()
  const [msg, setMsg] = useState('')

  function flash(text, ms = 2500) {
    setMsg(text)
    setTimeout(() => setMsg(''), ms)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const result = await db.importJSON(file)
      const total = Object.values(result).reduce((s,a) => s + a.length, 0)
      flash(`✓ Imported ${total} entries`)
    } catch (err) {
      flash(`✗ Import failed: ${err.message}`)
    }
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
    if (result.success) flash(`✓ Backed up to Google Drive: ${result.filename}`)
    else if (result.reason === 'not_configured') flash('⚠ Google Drive not configured — see .env.example')
    else flash(`✗ Backup failed: ${result.reason}`)
  }

  return (
    <div className="iobar">
      {msg && (
        <span style={{ fontSize: 10, color: 'var(--sl)', marginRight: 8 }}>{msg}</span>
      )}

      <button className="btn btn-sm btn-outline" onClick={db.exportJSON}>⬇ Export</button>

      <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
        ⬆ Import
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </label>

      <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
        ⬆ Aster Import
        <input ref={asterRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleAster} />
      </label>

      <button className="btn btn-sm btn-outline" onClick={db.exportAster}>⬇ Aster Export</button>

      <button className="btn btn-sm btn-outline" onClick={db.exportCSV || (() => {})}>📋 CSV</button>

      {backup.isConfigured && (
        <button className="btn btn-sm btn-outline" onClick={handleBackup} title={`Last backup: ${backup.lastBackup}`}>
          ☁ Backup
        </button>
      )}

      <button
        className="btn btn-sm btn-outline"
        style={{ color: '#ff3355', borderColor: '#ff335544' }}
        onClick={() => {
          if (confirm('Clear all data? This cannot be undone.')) {
            // Will implement in selective clear modal
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
