import { describe, expect, it, vi } from 'vitest'
import { createTableLoader, tableErrors, updateAndRefresh } from './tableStore'
import type { Table } from './types'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
describe('cargas independientes del store', () => {
  it('conserva el error inicial de perfiles después de otra carga y lo limpia al recuperarse', async () => {
    let fail = true
    const loader = createTableLoader(async (table) => {
      if (table === 'profiles' && fail) throw new Error('Sin conexión')
      return []
    }, vi.fn())
    await loader.refresh(['profiles', 'companies'])
    expect(loader.getSnapshot().tables.profiles).toEqual({
      loaded: false,
      loading: false,
      error: 'Sin conexión',
    })
    expect(loader.getSnapshot().tables.companies.loaded).toBe(true)
    await loader.refresh(['tasks'])
    expect(tableErrors(loader.getSnapshot().tables)).toContain('Perfiles: Sin conexión')
    fail = false
    await loader.refresh(['profiles'])
    expect(loader.getSnapshot().tables.profiles).toEqual({
      loaded: true,
      loading: false,
      error: '',
    })
    expect(tableErrors(loader.getSnapshot().tables)).toBe('')
  })
  it('distingue una tabla vacía de una sin cargar y expone la carga independiente', async () => {
    const pending = deferred<unknown[]>()
    const loader = createTableLoader(() => pending.promise, vi.fn())
    const refresh = loader.refresh(['profiles'])
    expect(loader.getSnapshot().tables.profiles.loading).toBe(true)
    expect(loader.getSnapshot().tables.tasks).toEqual({ loaded: false, loading: false, error: '' })
    pending.resolve([])
    await refresh
    expect(loader.getSnapshot().data.profiles).toEqual([])
    expect(loader.getSnapshot().tables.profiles.loaded).toBe(true)
    expect(loader.getSnapshot().tables.tasks.loaded).toBe(false)
  })
  it('conserva los datos anteriores y loaded cuando falla una actualización', async () => {
    const rows = [{ id: 'existing' }]
    const load = vi
      .fn()
      .mockResolvedValueOnce(rows)
      .mockRejectedValueOnce(new Error('Error de red'))
    const loader = createTableLoader(load, vi.fn())
    await loader.refresh(['profiles'])
    await loader.refresh(['profiles'])
    expect(loader.getSnapshot().data.profiles).toEqual(rows)
    expect(loader.getSnapshot().tables.profiles).toEqual({
      loaded: true,
      loading: false,
      error: 'Error de red',
    })
  })
  it('publica éxitos aunque otra consulta siga pendiente y después falle', async () => {
    const pending = deferred<unknown[]>()
    const loader = createTableLoader(
      (table) => (table === 'profiles' ? pending.promise : Promise.resolve([])),
      vi.fn(),
    )
    const refresh = loader.refresh(['profiles', 'companies'])
    await Promise.resolve()
    expect(loader.getSnapshot().tables.companies.loaded).toBe(true)
    expect(loader.getSnapshot().tables.profiles.loading).toBe(true)
    pending.reject(new Error('Falló perfiles'))
    await refresh
    expect(loader.getSnapshot().tables.companies.loaded).toBe(true)
  })
  it.each(['success', 'failure'])('ignora una respuesta antigua: %s', async (outcome) => {
    const old = deferred<unknown[]>()
    const load = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ id: 'new' }])
    const loader = createTableLoader(load, vi.fn())
    const first = loader.refresh(['profiles'])
    await loader.refresh(['profiles'])
    if (outcome === 'success') old.resolve([{ id: 'old' }])
    else old.reject(new Error('Error antiguo'))
    await first
    expect(loader.getSnapshot().data.profiles).toEqual([{ id: 'new' }])
    expect(loader.getSnapshot().tables.profiles.error).toBe('')
  })
  it('un éxito antiguo no borra el error de una solicitud más reciente', async () => {
    const old = deferred<unknown[]>()
    const loader = createTableLoader(
      vi.fn().mockReturnValueOnce(old.promise).mockRejectedValueOnce(new Error('Actual')),
      vi.fn(),
    )
    const first = loader.refresh(['profiles'])
    await loader.refresh(['profiles'])
    old.resolve([])
    await first
    expect(loader.getSnapshot().tables.profiles.error).toBe('Actual')
    expect(loader.getSnapshot().tables.profiles.loaded).toBe(false)
  })
  it('reiniciar invalida las respuestas de la sesión anterior', async () => {
    const pending = deferred<unknown[]>()
    const loader = createTableLoader(() => pending.promise, vi.fn())
    const refresh = loader.refresh(['profiles'])
    loader.reset()
    pending.resolve([{ id: 'private' }])
    await refresh
    expect(loader.getSnapshot().data.profiles).toEqual([])
    expect(loader.getSnapshot().tables.profiles.loaded).toBe(false)
  })
})
describe('invalidación después de una modificación', () => {
  it('actualiza reuniones e historial sin suscripción ni evento Realtime', async () => {
    let changed = false
    const load = vi.fn(async (table: Table) =>
      changed ? [{ id: table === 'meetings' ? 'meeting' : 'history' }] : [],
    )
    const loader = createTableLoader(load, vi.fn())
    const refresh = vi.fn(loader.refresh)
    await updateAndRefresh(
      'meetings',
      async () => {
        changed = true
      },
      refresh,
    )
    expect(refresh).toHaveBeenCalledWith(['meetings', 'meeting_changes'])
    expect(load).toHaveBeenCalledWith('meetings')
    expect(load).toHaveBeenCalledWith('meeting_changes')
    expect(loader.getSnapshot().data.meeting_changes).toEqual([{ id: 'history' }])
  })
  it('las demás tablas refrescan solamente su propia información', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    await updateAndRefresh('tasks', async () => {}, refresh)
    expect(refresh).toHaveBeenCalledWith(['tasks'])
  })
  it('no refresca si la modificación fue rechazada', async () => {
    const refresh = vi.fn()
    await expect(
      updateAndRefresh(
        'meetings',
        async () => {
          throw new Error('Sin permiso')
        },
        refresh,
      ),
    ).rejects.toThrow('Sin permiso')
    expect(refresh).not.toHaveBeenCalled()
  })
})
