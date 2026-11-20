import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { validateSupabaseEnvironment } from './environment'

// Se inicializa en el arranque, antes de importar App, dentro de su manejo de errores.
export let supabase: SupabaseClient
export function initializeSupabase() {
  const { url, key } = validateSupabaseEnvironment(import.meta.env)
  supabase = createClient(url, key)
}
export async function upload(file: File, userId: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo supera los 20 MB.')
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${crypto.randomUUID()}/${name}`
  const { error } = await supabase.storage.from('pulso-files').upload(path, file, { upsert: false })
  if (error) throw error
  return path
}
export async function fileUrl(path: string, seconds = 3600) {
  const { data, error } = await supabase.storage.from('pulso-files').createSignedUrl(path, seconds)
  if (error) throw error
  return data.signedUrl
}
