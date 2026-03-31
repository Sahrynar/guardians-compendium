import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabase } from '../supabase'

const LS_KEY = 'gcomp3'
const CATEGORIES = [
  'characters','wardrobe','items','locations','timeline',
  'scenes','canon','world','questions','spellings',
  'calendar_entries','flags','maps','wiki','notes','family_tree',
  'inventory','manuscript','journal_captures','journal_tags'
]

// ── Local storage helpers ──────────────────────────────────────
function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return makeEmpty()
    const parsed = JSON.parse(raw)
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
    if (db[row.category] !== undefined) db[row.category].push({ id: row.id, ...row.data })
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
  const [syncStatus, setSyncStatus] = useState('local')
  const pendingRef = useRef(new Map())

  useEffect(() => {
    async function init() {
      setLoading(true)
      const local = lsLoad()
      setDbState(local)
      if (hasSupabase) {
        setSyncStatus('syncing')
        const remote = await sbLoad()
        if (remote) {
          const merged = mergeDB(local, remote)
          setDbState(merged)
          lsSave(merged)
          setSyncStatus('synced')
        } else {
          setSyncStatus('error')
        }
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
    // Also mirror to localStorage as instant-read cache
    try {
      const existing = JSON.parse(localStorage.getItem('gcomp_settings') || '{}')
      localStorage.setItem('gcomp_settings', JSON.stringify({ ...existing, [key]: value }))
    } catch {}
  }, [])

  // ── getSetting: reads from Supabase-loaded settings state ──
  // Falls back to localStorage cache so first render isn't blank
  const getSetting = useCallback((key, fallback = null) => {
    if (settings[key] !== undefined) return settings[key]
    try {
      const cached = JSON.parse(localStorage.getItem('gcomp_settings') || '{}')
      if (cached[key] !== undefined) return cached[key]
    } catch {}
    return fallback
  }, [settings])

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
          setDbState(prev => {
            const next = { ...prev }
            CATEGORIES.forEach(k => {
              if (!parsed[k] || !Array.isArray(parsed[k])) return
              const existingIds = new Set((prev[k] || []).map(e => e.id).filter(Boolean))
              const newEntries = parsed[k].filter(e => e.id && !existingIds.has(e.id))
              next[k] = [...(prev[k] || []), ...newEntries]
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
          const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7)
          setDbState(prev => {
            const next = { ...prev }
            if (p.characters) p.characters.forEach(ch => {
              const entry = { id: uid(), name: ch.name || '', aliases: (ch.aliases||[]).join(', '),
                birthday: ch.birthYear||'', age_b1: ch.ageNotes||'', notes: ch.notes||'',
                status: ch.status==='locked'?'locked':'provisional', books: [], relationships: [] }
              next.characters = [...next.characters, entry]; count++
            })
            if (p.events) p.events.forEach(ev => {
              const entry = { id: uid(), name: ev.title||'', date_hc: ev.displayYear||'',
                sort_order: String(ev.sortKey||''), era: ev.category||'', detail: ev.notes||'',
                status: ev.status==='locked'?'locked':'provisional', books: [], relationships: [] }
              next.timeline = [...next.timeline, entry]; count++
            })
            if (p.places) p.places.forEach(pl => {
              const entry = { id: uid(), name: pl.name||'', loc_type: pl.type||'',
                parent_id: '', description: pl.notes||'', status: 'provisional', books: [], relationships: [] }
              next.locations = [...next.locations, entry]; count++
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
    upsertEntry, deleteEntry, save, saveSetting, getSetting,
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
    const all = new Map([...localMap, ...remoteMap])
    merged[cat] = Array.from(all.values())
  })
  return merged
}
