export function validateSupabaseEnvironment(env: Record<string, unknown>) {
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const
  const missing = names.filter((name) => typeof env[name] !== 'string' || !String(env[name]).trim())
  if (missing.length)
    throw new Error(
      `Configuración incompleta: falta ${missing.join(', ')}. Configurá estas variables antes de iniciar o compilar PULSO.`,
    )
  const url = String(env.VITE_SUPABASE_URL).trim()
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY).trim()
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('VITE_SUPABASE_URL debe ser una URL válida con http o https.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('VITE_SUPABASE_URL debe ser una URL válida con http o https.')
  }
  return { url, key }
}
