import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabase } from '../supabase'

const LS_KEY = 'gcomp3'
const CATEGORIES = [
  'characters','wardrobe','items','locations','timeline',
  'scenes','canon','world','questions','spellings',
  'calendar_entries','flags','maps','wiki','notes','family_tree','session_logs'
]

// ── Local storage helpers ──────────────────────────────────────
function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return makeEmpty()
    const parsed = JSON.parse(raw)
    // Ensure all categories exist
    const db = makeEmpty()
    CATEGORIES.forEach(k => { if (parsed[k]) db[k] = parsed[k] })
    return db
  } catch { return makeEmpty() }
}

function lsSave(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch {}
}

function makeEmpty() {
  const db = {}
  CATEGORIES.forEach(k => { db[k] = [] })
  return db
}

// ── Supabase sync ──────────────────────────────────────────────
async function sbLoad() {
  if (!hasSupabase) return null
  const { data, error } = await supabase.from('entries').select('*')
  if (error) { console.error('Supabase load error:', error); return null }
  const db = makeEmpty()
  data.forEach(row => {
    if (db[row.category]) db[row.category].push({ id: row.id, ...row.data })
  })
  return db
}

async function sbUpsert(category, entry) {
  if (!hasSupabase) return
  const { id, ...data } = entry
  const { error } = await supabase.from('entries').upsert({
    id, category, data, updated_at: new Date().toISOString()
  })
  if (error) console.error('Supabase upsert error:', error)
}

async function sbDelete(id) {
  if (!hasSupabase) return
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) console.error('Supabase delete error:', error)
}

async function sbLoadSettings() {
  if (!hasSupabase) return null
  const { data, error } = await supabase.from('settings').select('*')
  if (error) return null
  const s = {}
  data.forEach(row => { s[row.key] = row.value })
  return s
}

async function sbSaveSetting(key, value) {
  if (!hasSupabase) return
  await supabase.from('settings').upsert({ key, value })
}

// ── Main hook ──────────────────────────────────────────────────
export function useDB() {
  const [db, setDbState] = useState(makeEmpty)
  const [settings, setSettingsState] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('local') // 'local' | 'synced' | 'syncing' | 'error'
  const pendingRef = useRef(new Map()) // id → timeout for debounced saves

  // Load on mount
  useEffect(() => {
    async function init() {
      setLoading(true)
      // Always load localStorage first (instant)
      const local = lsLoad()
      setDbState(local)
      // Then try Supabase
      if (hasSupabase) {
        setSyncStatus('syncing')
        const remote = await sbLoad()
        if (remote) {
          // Merge: remote wins for any id that exists in both
          const merged = mergeDB(local, remote)
          setDbState(merged)
          lsSave(merged)
          setSyncStatus('synced')
        } else {
          setSyncStatus('error')
        }
        // Load settings
        const remoteSettings = await sbLoadSettings()
        if (remoteSettings) setSettingsState(remoteSettings)
      }
      setLoading(false)
    }
    init()
  }, [])

  // ── DB operations ──────────────────────────────────────────
  const save = useCallback((newDb) => {
    setDbState(newDb)
    lsSave(newDb)
  }, [])

  const upsertEntry = useCallback((category, entry) => {
    setDbState(prev => {
      const next = { ...prev, [category]: [...(prev[category] || [])] }
      const idx = next[category].findIndex(e => e.id === entry.id)
      if (idx >= 0) next[category][idx] = entry
      else next[category].push(entry)
      lsSave(next)
      return next
    })
    // Debounced Supabase sync
    if (hasSupabase) {
      const key = entry.id
      if (pendingRef.current.has(key)) clearTimeout(pendingRef.current.get(key))
      pendingRef.current.set(key, setTimeout(() => {
        sbUpsert(category, entry)
        setSyncStatus('synced')
        pendingRef.current.delete(key)
      }, 1000))
    }
  }, [])

  const deleteEntry = useCallback((category, id) => {
    setDbState(prev => {
      const next = { ...prev, [category]: (prev[category] || []).filter(e => e.id !== id) }
      lsSave(next)
      return next
    })
    if (hasSupabase) sbDelete(id)
  }, [])

  const saveSetting = useCallback((key, value) => {
    setSettingsState(prev => ({ ...prev, [key]: value }))
    if (hasSupabase) sbSaveSetting(key, value)
    try {
      const existing = JSON.parse(localStorage.getItem('gcomp_settings') || '{}')
      localStorage.setItem('gcomp_settings', JSON.stringify({ ...existing, [key]: value }))
    } catch {}
  }, [])

  // ── Import/Export ──────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `guardians_backup_${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }, [db])

  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result)
          // MERGE — never overwrite. Add new entries by ID only.
          setDbState(prev => {
            const next = { ...prev }
            CATEGORIES.forEach(k => {
              if (!parsed[k] || !Array.isArray(parsed[k])) return
              const existingIds = new Set((prev[k] || []).map(e => e.id).filter(Boolean))
              const newEntries = parsed[k].filter(e => e.id && !existingIds.has(e.id))
              next[k] = [...(prev[k] || []), ...newEntries]
              // Sync new entries to Supabase
              if (hasSupabase) newEntries.forEach(entry => sbUpsert(k, entry))
            })
            lsSave(next)
            return next
          })
          resolve(parsed)
        } catch (e) { reject(e) }
      }
      r.readAsText(file)
    })
  }, [])

  // ── Aster import ───────────────────────────────────────────
  const importAster = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = ev => {
        try {
          const p = JSON.parse(ev.target.result)
          let count = 0
          const genUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7)

          // Detect if this is a full Compendium JSON (not Aster-format)
          const isFullFormat = CATEGORIES.some(k => Array.isArray(p[k]) && p[k].length > 0)
          if (isFullFormat) {
            // Treat as regular import — merge all categories
            setDbState(prev => {
              const next = { ...prev }
              CATEGORIES.forEach(k => {
                if (!p[k] || !Array.isArray(p[k])) return
                if (k === 'family_tree') {
                  const exRoot = (prev[k] || [])[0] || { id: '_root', nodes: [], edges: [] }
                  const incRoot = p[k][0]
                  if (!incRoot) return
                  const exNodeIds = new Set((exRoot.nodes || []).map(n => n.id))
                  const exEdgeIds = new Set((exRoot.edges || []).map(e => e.id))
                  next[k] = [{ ...exRoot, ...incRoot,
                    nodes: [...(exRoot.nodes||[]), ...(incRoot.nodes||[]).filter(n => !exNodeIds.has(n.id))],
                    edges: [...(exRoot.edges||[]), ...(incRoot.edges||[]).filter(e => !exEdgeIds.has(e.id))],
                  }]
                  return
                }
                const existingIds = new Set((prev[k] || []).map(e => e.id).filter(Boolean))
                const newEntries = p[k].filter(e => e.id && !existingIds.has(e.id))
                next[k] = [...(prev[k] || []), ...newEntries]
                count += newEntries.length
              })
              lsSave(next)
              return next
            })
            resolve(count)
            return
          }

          // Aster-format: map Aster field names to Compendium fields
          setDbState(prev => {
            const next = { ...prev }
            if (p.characters) p.characters.forEach(ch => {
              const id = ch.id || genUid()
              const existingIds = new Set((next.characters || []).map(e => e.id))
              if (existingIds.has(id)) return
              next.characters = [...(next.characters||[]), {
                id, name: ch.name||'', aliases: (ch.aliases||[]).join(', '),
                birthday: ch.birthYear||'', age_b1: ch.ageNotes||'', notes: ch.notes||'',
                status: ch.status==='locked'?'locked':'provisional', books: [], relationships: []
              }]; count++
            })
            if (p.events) p.events.forEach(ev => {
              const id = ev.id || genUid()
              const existingIds = new Set((next.timeline || []).map(e => e.id))
              if (existingIds.has(id)) return
              next.timeline = [...(next.timeline||[]), {
                id, name: ev.title||'', date_hc: ev.displayYear||'',
                sort_order: String(ev.sortKey||''), era: ev.category||'', detail: ev.notes||'',
                status: ev.status==='locked'?'locked':'provisional', books: [], relationships: []
              }]; count++
            })
            if (p.places) p.places.forEach(pl => {
              const id = pl.id || genUid()
              const existingIds = new Set((next.locations || []).map(e => e.id))
              if (existingIds.has(id)) return
              next.locations = [...(next.locations||[]), {
                id, name: pl.name||'', loc_type: pl.type||'',
                parent_id: '', description: pl.notes||'', status: 'provisional', books: [], relationships: []
              }]; count++
            })
            // Handle any other categories present in Aster export if they match Compendium keys
            CATEGORIES.filter(k => !['characters','timeline','locations','family_tree'].includes(k)).forEach(k => {
              if (!p[k] || !Array.isArray(p[k])) return
              const existingIds = new Set((next[k] || []).map(e => e.id).filter(Boolean))
              const newEntries = p[k].filter(e => e.id && !existingIds.has(e.id))
              next[k] = [...(next[k] || []), ...newEntries]
              count += newEntries.length
            })
            lsSave(next)
            return next
          })
          resolve(count)
        } catch (e) { reject(e) }
      }
      r.readAsText(file)
    })
  }, [])

  // ── Aster export ───────────────────────────────────────────
  const exportAster = useCallback(() => {
    const asterData = {
      characters: db.characters.map(ch => ({
        name: ch.name, aliases: ch.aliases ? ch.aliases.split(',').map(s=>s.trim()) : [],
        birthYear: ch.birthday || '', ageNotes: ch.age_b1 || '',
        notes: ch.notes || '', status: ch.status || 'provisional'
      })),
      events: db.timeline.map(ev => ({
        title: ev.name, displayYear: ev.date_hc || '', sortKey: parseFloat(ev.sort_order)||0,
        category: ev.era || '', notes: ev.detail || '', status: ev.status || 'provisional'
      })),
      places: db.locations.map(loc => ({
        name: loc.name, type: loc.loc_type || '', notes: loc.description || ''
      }))
    }
    const blob = new Blob([JSON.stringify(asterData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `guardians_aster_export_${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }, [db])

  return {
    db, settings, loading, syncStatus,
    upsertEntry, deleteEntry, save, saveSetting,
    exportJSON, importJSON, importAster, exportAster,
    hasSupabase, CATEGORIES
  }
}

// ── Merge helper ───────────────────────────────────────────────
function mergeDB(local, remote) {
  const merged = makeEmpty()
  CATEGORIES.forEach(cat => {
    const localMap = new Map((local[cat]||[]).map(e => [e.id, e]))
    const remoteMap = new Map((remote[cat]||[]).map(e => [e.id, e]))
    // Remote wins on conflicts
    const all = new Map([...localMap, ...remoteMap])
    merged[cat] = Array.from(all.values())
  })
  return merged
}
