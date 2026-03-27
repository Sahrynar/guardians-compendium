import { supabase, hasSupabase } from '../supabase'

const BUCKET = 'compendium-images'

export async function uploadImage(file, folder = 'items') {
  if (!hasSupabase) return { url: null, error: 'No Supabase connection' }
  if (!file) return { url: null, error: 'No file provided' }

  const ext = file.name.split('.').pop()
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(name, file, { upsert: false, contentType: file.type })

  if (error) return { url: null, error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(name)

  return { url: publicUrl, error: null }
}
