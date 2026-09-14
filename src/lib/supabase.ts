import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://ckcbxnhwpnvhpskculga.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cCX6krVyAF6Q-4JVCr1GVg_LxPkkl4o',
)
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
