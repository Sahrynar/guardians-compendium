import { useEffect, useRef, useCallback } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const LS_LAST_BACKUP = 'gcomp_last_backup'
const LS_GDRIVE_FOLDER = 'gcomp_gdrive_folder'

export function useAutoBackup(db) {
  const tokenRef = useRef(null)
  const timerRef = useRef(null)

  const isConfigured = !!CLIENT_ID

  // Load GIS script
  useEffect(() => {
    if (!isConfigured) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    document.head.appendChild(script)
    return () => { if (script.parentNode) script.parentNode.removeChild(script) }
  }, [isConfigured])

  const signIn = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!window.google) { reject(new Error('Google API not loaded')); return }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response) => {
          if (response.error) reject(new Error(response.error))
          else { tokenRef.current = response.access_token; resolve(response.access_token) }
        }
      })
      client.requestAccessToken()
    })
  }, [])

  const getOrCreateFolder = useCallback(async (token) => {
    const existing = localStorage.getItem(LS_GDRIVE_FOLDER)
    if (existing) return existing

    // Check if folder exists
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='Guardians Compendium Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const searchData = await search.json()
    if (searchData.files && searchData.files.length > 0) {
      const id = searchData.files[0].id
      localStorage.setItem(LS_GDRIVE_FOLDER, id)
      return id
    }

    // Create folder
    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Guardians Compendium Backups', mimeType: 'application/vnd.google-apps.folder' })
    })
    const createData = await create.json()
    localStorage.setItem(LS_GDRIVE_FOLDER, createData.id)
    return createData.id
  }, [])

  const doBackup = useCallback(async (dbData, silent = false) => {
    if (!isConfigured) return { success: false, reason: 'not_configured' }
    try {
      let token = tokenRef.current
      if (!token) {
        if (silent) return { success: false, reason: 'no_token' }
        token = await signIn()
      }

      const folderId = await getOrCreateFolder(token)
      const filename = `guardians_backup_${new Date().toISOString().slice(0,10)}.json`
      const content = JSON.stringify(dbData, null, 2)

      const metadata = { name: filename, mimeType: 'application/json', parents: [folderId] }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([content], { type: 'application/json' }))

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      localStorage.setItem(LS_LAST_BACKUP, Date.now().toString())
      return { success: true, filename }
    } catch (err) {
      console.error('Backup error:', err)
      return { success: false, reason: err.message }
    }
  }, [isConfigured, signIn, getOrCreateFolder])

  // Auto-backup timer
  useEffect(() => {
    if (!isConfigured) return
    const checkAndBackup = () => {
      const last = parseInt(localStorage.getItem(LS_LAST_BACKUP) || '0')
      const now = Date.now()
      if (now - last > BACKUP_INTERVAL_MS) {
        doBackup(db, true) // silent — don't prompt sign-in automatically
      }
    }
    timerRef.current = setInterval(checkAndBackup, 60 * 60 * 1000) // check every hour
    checkAndBackup() // check on mount
    return () => clearInterval(timerRef.current)
  }, [db, doBackup, isConfigured])

  const lastBackup = localStorage.getItem(LS_LAST_BACKUP)
    ? new Date(parseInt(localStorage.getItem(LS_LAST_BACKUP))).toLocaleString()
    : 'Never'

  return { doBackup, signIn, lastBackup, isConfigured }
}
