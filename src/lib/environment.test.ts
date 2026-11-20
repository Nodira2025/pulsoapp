import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateSupabaseEnvironment } from './environment'
const valid = {
  VITE_SUPABASE_URL: 'https://ci.invalid',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'ci-placeholder',
}
describe('configuración de Supabase', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('acepta las variables ficticias del workflow sin conectarse', () => {
    expect(validateSupabaseEnvironment(valid)).toEqual({
      url: valid.VITE_SUPABASE_URL,
      key: valid.VITE_SUPABASE_PUBLISHABLE_KEY,
    })
  })
  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])(
    'identifica la variable faltante %s',
    (name) => {
      expect(() => validateSupabaseEnvironment({ ...valid, [name]: undefined })).toThrow(name)
    },
  )
  it('identifica ambas variables cuando faltan', () => {
    expect(() => validateSupabaseEnvironment({})).toThrow(
      /VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY/,
    )
  })
  it('rechaza espacios como valor', () => {
    expect(() =>
      validateSupabaseEnvironment({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: '  ' }),
    ).toThrow('VITE_SUPABASE_PUBLISHABLE_KEY')
  })
  it.each(['not-a-url', 'ftp://ci.invalid'])(
    'rechaza URL inválida sin revelar valores: %s',
    (url) => {
      expect(() => validateSupabaseEnvironment({ ...valid, VITE_SUPABASE_URL: url })).toThrow(
        'VITE_SUPABASE_URL debe ser una URL válida',
      )
    },
  )
  it('permite importar el cliente sin variables y falla recién al inicializar', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined)
    const { initializeSupabase } = await import('./supabase')
    expect(() => initializeSupabase()).toThrow('VITE_SUPABASE_')
  })
})
