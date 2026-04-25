import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, hasSupabase } from '../supabase'

const LS_KEY = 'gcomp3'
const LS_SETTINGS_KEY = 'gcomp_settings'
const LS_ACTIVITY_KEY = 'gcomp_activity_log'

const CATEGORIES = [
  'characters','wardrobe','items','locations','timeline',
  'scenes','canon','world','questions','spellings',
  'calendar_entries','flags','maps','wiki','notes','family_tree',
  'images','manuscript','inventory','eras','journal','ideas_list',
  'journal_captures','journal_tags'
]

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
function lsSave(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch {} }
function makeEmpty() { const db = {}; CATEGORIES.forEach(k => { db[k] = [] }); return db }

function activityLoad() { try { return JSON.parse(localStorage.getItem(LS_ACTIVITY_KEY)) || [] } catch { return [] } }
function activitySave(log) { try { localStorage.setItem(LS_ACTIVITY_KEY, JSON.stringify(log)) } catch {} }

async function sbLoad() {
  if (!hasSupabase) return null
  const { data, error } = await supabase.from('entries').select('*')
  if (error) { console.error('Supabase load error:', error); return null }
  const db = makeEmpty()
  data.forEach(row => { if (db[row.category] !== undefined) db[row.category].push({ id: row.id, ...row.data }) })
  return db
}
async function sbUpsert(category, entry) {
  if (!hasSupabase) return
  const { id, ...data } = entry
  const { error } = await supabase.from('entries').upsert({ id, category, data, updated_at: new Date().toISOString() })
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
  const s = {}; data.forEach(row => { s[row.key] = row.value }); return s
}
async function sbSaveSetting(key, value) {
  if (!hasSupabase) return
  await supabase.from('settings').upsert({ key, value })
}
async function sbSaveActivityEntry(entry) {
  if (!hasSupabase) return
  try { await supabase.from('activity_log').upsert(entry, { onConflict: 'id' }) } catch {}
}
async function sbLoadActivity() {
  if (!hasSupabase) return null
  try {
    const { data, error } = await supabase.from('activity_log').select('*').order('timestamp', { ascending: false })
    if (error) return null
    return data || []
  } catch { return null }
}

function computeDiff(before, after) {
  if (!before || !after) return null
  const changes = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  allKeys.forEach(k => {
    if (k === 'id') return
    const bv = JSON.stringify(before[k] ?? '')
    const av = JSON.stringify(after[k] ?? '')
    if (bv !== av) changes.push({ field: k, before: before[k] ?? '', after: after[k] ?? '' })
  })
  return changes.length > 0 ? changes : null
}

const makeUID = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function parseSetting(val) {
  if (val === null || val === undefined) return {}
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return {} }
}

export function useDB() {
  const [db, setDbState] = useState(makeEmpty)
  const [settings, setSettingsState] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('local')
  const [activityLog, setActivityLog] = useState([])
  const [toast, setToast] = useState(null)
  const [lastUndoable, setLastUndoable] = useState(null)
  const toastTimerRef = useRef(null)
  const floatTimerRef = useRef(null)
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
          setDbState(merged); lsSave(merged); setSyncStatus('synced')
        } else { setSyncStatus('error') }

        const remoteSettings = await sbLoadSettings()
        const localSettings = (() => { try { return JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || '{}') } catch { return {} } })()
        if (remoteSettings) {
          const merged = { ...localSettings, ...remoteSettings }
          Object.keys(localSettings).forEach(k => {
            if (!remoteSettings[k] && localSettings[k]) { merged[k] = localSettings[k]; sbSaveSetting(k, localSettings[k]) }
          })
          setSettingsState(merged)
        } else { setSettingsState(localSettings) }

        const remoteActivity = await sbLoadActivity()
        if (remoteActivity && remoteActivity.length > 0) { setActivityLog(remoteActivity); activitySave(remoteActivity) }
        else { setActivityLog(activityLoad()) }
      } else { setActivityLog(activityLoad()) }
      setLoading(false)
    }
    init()
  }, [])

  const logActivity = useCallback((action, category, entry, prevEntry = null) => {
    const diff = action === 'edit' ? computeDiff(prevEntry, entry) : null
    const entryName = entry?.name || entry?.title ||
      (entry?.session_number != null ? `Session ${entry.session_number}` : null) || entry?.id || 'Unknown'
    const record = {
      id: makeUID(), timestamp: new Date().toISOString(),
      action, category, entry_id: entry?.id || null, entry_name: entryName,
      snapshot: entry ? JSON.parse(JSON.stringify(entry)) : null, diff, undone: false,
    }
    setActivityLog(prev => { const next = [record, ...prev]; activitySave(next); sbSaveActivityEntry(record); return next })
    return record
  }, [])

  const showToast = useCallback((message, entry, category, action, prevSnapshot = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current)
    const item = { id: makeUID(), message, entry, category, action, prevSnapshot, ts: Date.now() }
    setToast(item); setLastUndoable(item)
    toastTimerRef.current = setTimeout(() => setToast(null), 12000)
    floatTimerRef.current = setTimeout(() => setLastUndoable(null), 300000)
  }, [])

  const dismissToast = useCallback(() => { setToast(null); if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const undoAction = useCallback((undoItem) => {
    if (!undoItem) return
    const { entry, category, action, prevSnapshot } = undoItem
    setDbState(prev => {
      const next = { ...prev, [category]: [...(prev[category] || [])] }
      if (action === 'delete') {
        if (!next[category].some(e => e.id === entry.id)) { next[category] = [...next[category], entry]; sbUpsert(category, entry) }
      } else if (action === 'add') { next[category] = next[category].filter(e => e.id !== entry.id); sbDelete(entry.id) }
      else if (action === 'edit' && prevSnapshot) {
        const idx = next[category].findIndex(e => e.id === prevSnapshot.id)
        if (idx >= 0) next[category][idx] = prevSnapshot; else next[category].push(prevSnapshot)
        sbUpsert(category, prevSnapshot)
      }
      lsSave(next); return next
    })
    logActivity('restore', category, entry)
    setToast(null); setLastUndoable(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current)
  }, [logActivity])

  const undoActivityRecord = useCallback((recordId) => {
    const record = activityLog.find(r => r.id === recordId)
    if (!record || record.undone || !record.snapshot) return
    const { action, category, snapshot, diff } = record
    setDbState(prev => {
      const next = { ...prev, [category]: [...(prev[category] || [])] }
      if (action === 'delete') {
        if (!next[category].some(e => e.id === snapshot.id)) { next[category] = [...next[category], snapshot]; sbUpsert(category, snapshot) }
      } else if (action === 'add') { next[category] = next[category].filter(e => e.id !== snapshot.id); sbDelete(snapshot.id) }
      else if ((action === 'edit' || action === 'import') && diff) {
        const idx = next[category].findIndex(e => e.id === snapshot.id)
        if (idx >= 0) next[category][idx] = snapshot; else next[category].push(snapshot)
        sbUpsert(category, snapshot)
      }
      lsSave(next); return next
    })
    setActivityLog(prev => { const next = prev.map(r => r.id === recordId ? { ...r, undone: true } : r); activitySave(next); return next })
  }, [activityLog])

  const save = useCallback((newDb) => { setDbState(newDb); lsSave(newDb) }, [])

  const upsertEntry = useCallback((category, entry, opts = {}) => {
    const { silent = false } = opts
    let prevEntry = null
    setDbState(prev => {
      const next = { ...prev, [category]: [...(prev[category] || [])] }
      const idx = next[category].findIndex(e => e.id === entry.id)
      if (idx >= 0) { prevEntry = JSON.parse(JSON.stringify(next[category][idx])); next[category][idx] = entry }
      else next[category].push(entry)
      lsSave(next); return next
    })
    if (!silent) {
      const action = prevEntry ? 'edit' : 'add'
      const record = logActivity(action, category, entry, prevEntry)
      if (action === 'edit') showToast(`Edited: ${record.entry_name}`, entry, category, 'edit', prevEntry)
    }
    if (hasSupabase) {
      const key = entry.id
      if (pendingRef.current.has(key)) clearTimeout(pendingRef.current.get(key))
      pendingRef.current.set(key, setTimeout(() => { sbUpsert(category, entry); setSyncStatus('synced'); pendingRef.current.delete(key) }, 1000))
    }
  }, [logActivity, showToast])

  const deleteEntry = useCallback((category, id) => {
    let deletedEntry = null
    setDbState(prev => {
      deletedEntry = (prev[category] || []).find(e => e.id === id) || null
      const next = { ...prev, [category]: (prev[category] || []).filter(e => e.id !== id) }
      lsSave(next); return next
    })
    setTimeout(() => {
      if (deletedEntry) {
        const record = logActivity('delete', category, deletedEntry)
        showToast(`Deleted: ${record.entry_name}`, deletedEntry, category, 'delete')
        if (hasSupabase) sbDelete(id)
      }
    }, 0)
  }, [logActivity, showToast])

  const saveSetting = useCallback((key, value) => {
    setSettingsState(prev => ({ ...prev, [key]: value }))
    if (hasSupabase) sbSaveSetting(key, value)
    try {
      const existing = JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || '{}')
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify({ ...existing, [key]: value }))
    } catch {}
  }, [])

  const getSetting = useCallback((key, fallback = null) => {
    const val = settings[key]; return (val === undefined || val === null) ? fallback : val
  }, [settings])

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_backup_${new Date().toISOString().slice(0,10)}.json`; a.click()
  }, [db])

  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = async ev => {
        try {
          const parsed = JSON.parse(ev.target.result)
          let added = 0; const conflicts = []
          setDbState(prev => {
            const next = { ...prev }
            CATEGORIES.forEach(k => {
              if (!parsed[k] || !Array.isArray(parsed[k])) return
              const existingMap = new Map((prev[k] || []).map(e => [e.id, e]))
              parsed[k].forEach(entry => {
                if (!entry.id) return
                if (existingMap.has(entry.id)) conflicts.push({ category: k, incoming: entry, existing: existingMap.get(entry.id) })
                else { next[k] = [...(next[k] || []), entry]; if (hasSupabase) sbUpsert(k, entry); logActivity('import', k, entry); added++ }
              })
            })
            lsSave(next); return next
          })
          // Handle session_log - stored in its own Supabase table, not in CATEGORIES
          let sessionLogAdded = 0
          if (parsed.session_log && Array.isArray(parsed.session_log) && hasSupabase) {
            for (const entry of parsed.session_log) {
              if (!entry?.id) continue
              const { error } = await supabase.from('session_log').upsert(entry, { onConflict: 'id', ignoreDuplicates: true })
              if (!error) sessionLogAdded++
            }
          }
          resolve({ added, conflicts, sessionLogAdded })
        } catch (e) { reject(e) }
      }
      r.readAsText(file)
    })
  }, [logActivity])

  const resolveConflict = useCallback((category, incoming, choice) => {
    if (choice === 'keep_existing') return
    if (choice === 'use_incoming') {
      setDbState(prev => {
        const next = { ...prev, [category]: [...(prev[category] || [])] }
        const idx = next[category].findIndex(e => e.id === incoming.id)
        const prevEntry = idx >= 0 ? JSON.parse(JSON.stringify(next[category][idx])) : null
        if (idx >= 0) next[category][idx] = incoming
        lsSave(next); if (hasSupabase) sbUpsert(category, incoming); logActivity('edit', category, incoming, prevEntry); return next
      })
    } else if (choice === 'keep_both') {
      const newEntry = { ...incoming, id: makeUID() }
      setDbState(prev => {
        const next = { ...prev, [category]: [...(prev[category] || []), newEntry] }
        lsSave(next); if (hasSupabase) sbUpsert(category, newEntry); logActivity('import', category, newEntry); return next
      })
    }
  }, [logActivity])

  const importAster = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = ev => {
        try {
          const p = JSON.parse(ev.target.result); let count = 0
          const uid2 = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7)
          setDbState(prev => {
            const next = { ...prev }
            if (p.characters) p.characters.forEach(ch => {
              const entry = { id: uid2(), name: ch.name||'', aliases: (ch.aliases||[]).join(', '),
                birthday: ch.birthYear||'', age_b1: ch.ageNotes||'', notes: ch.notes||'',
                status: ch.status==='locked'?'locked':'provisional', books: [], relationships: [] }
              next.characters = [...next.characters, entry]; logActivity('import', 'characters', entry); count++
            })
            if (p.events) p.events.forEach(ev => {
              const entry = { id: uid2(), name: ev.title||'', date_hc: ev.displayYear||'',
                sort_order: String(ev.sortKey||''), era: ev.category||'', detail: ev.notes||'',
                status: ev.status==='locked'?'locked':'provisional', books: [], relationships: [] }
              next.timeline = [...next.timeline, entry]; logActivity('import', 'timeline', entry); count++
            })
            if (p.places) p.places.forEach(pl => {
              const entry = { id: uid2(), name: pl.name||'', loc_type: pl.type||'',
                parent_id: '', description: pl.notes||'', status: 'provisional', books: [], relationships: [] }
              next.locations = [...next.locations, entry]; logActivity('import', 'locations', entry); count++
            })
            lsSave(next); return next
          })
          resolve(count)
        } catch (e) { reject(e) }
      }
      r.readAsText(file)
    })
  }, [logActivity])

  const exportAster = useCallback(() => {
    const asterData = {
      characters: db.characters.map(ch => ({ name: ch.name, aliases: ch.aliases ? ch.aliases.split(',').map(s=>s.trim()) : [], birthYear: ch.birthday||'', ageNotes: ch.age_b1||'', notes: ch.notes||'', status: ch.status||'provisional' })),
      events: db.timeline.map(ev => ({ title: ev.name, displayYear: ev.date_hc||'', sortKey: parseFloat(ev.sort_order)||0, category: ev.era||'', notes: ev.detail||'', status: ev.status||'provisional' })),
      places: db.locations.map(loc => ({ name: loc.name, type: loc.loc_type||'', notes: loc.description||'' }))
    }
    const blob = new Blob([JSON.stringify(asterData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_aster_export_${new Date().toISOString().slice(0,10)}.json`; a.click()
  }, [db])

  const exportMarkdown = useCallback((cats) => {
    const lines = [`# The Guardians of Lajen — Compendium Export\n\n*Exported ${new Date().toLocaleDateString()}*\n`]
    cats.forEach(cat => {
      const entries = db[cat]; if (!entries || !entries.length) return
      lines.push(`\n## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`)
      entries.forEach(e => {
        const title = e.name || e.title || e.term || e.question || e.id
        lines.push(`### ${title}`)
        Object.entries(e).forEach(([k, v]) => { if (k === 'id' || k === 'name' || k === 'title' || !v) return; if (typeof v === 'string' && v.trim()) lines.push(`**${k}:** ${v}`) })
        lines.push('')
      })
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_export_${new Date().toISOString().slice(0,10)}.md`; a.click()
  }, [db])

  const exportCSV = useCallback(() => {
    const rows = [['category','id','name']]
    CATEGORIES.forEach(cat => { (db[cat] || []).forEach(e => { rows.push([cat, e.id || '', e.name || e.title || e.term || '']) }) })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `guardians_export_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }, [db])

  return {
    db, settings, loading, syncStatus,
    upsertEntry, deleteEntry, save, saveSetting, getSetting,
    exportJSON, importJSON, importAster, exportAster,
    exportMarkdown, exportCSV,
    resolveConflict,
    activityLog, logActivity,
    toast, dismissToast, undoAction, showToast,
    lastUndoable, undoActivityRecord,
    hasSupabase, CATEGORIES
  }
}

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
