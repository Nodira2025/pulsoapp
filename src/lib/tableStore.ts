import { emptyData, type Data, type Table } from './types'
import { messageOf } from './utils'

export const ALL_TABLES = Object.keys(emptyData) as Table[]
export type TableState = { loaded: boolean; loading: boolean; error: string }
export type TableStates = Record<Table, TableState>
export type TableSnapshot = { data: Data; tables: TableStates }
export function initialTableSnapshot(): TableSnapshot {
  return {
    data: emptyData,
    tables: Object.fromEntries(
      ALL_TABLES.map((table) => [table, { loaded: false, loading: false, error: '' }]),
    ) as TableStates,
  }
}
const tableLabels: Record<Table, string> = {
  profiles: 'Perfiles',
  companies: 'Empresas',
  projects: 'Proyectos',
  tasks: 'Tareas',
  posts: 'Novedades',
  comments: 'Comentarios',
  reactions: 'Reacciones',
  installments: 'Cuotas',
  payments: 'Pagos',
  expenses: 'Gastos',
  meetings: 'Reuniones',
  meeting_changes: 'Historial de reuniones',
  attachments: 'Archivos',
  notifications: 'Notificaciones',
}
export function tableErrors(tables: TableStates): string {
  return ALL_TABLES.filter((table) => tables[table].error)
    .map((table) => `${tableLabels[table]}: ${tables[table].error}`)
    .join(' · ')
}

// Núcleo de carga compartido por el provider y sus pruebas, sin depender de Realtime.
export function createTableLoader(
  load: (table: Table) => Promise<unknown[]>,
  publish: (snapshot: TableSnapshot) => void,
) {
  let snapshot = initialTableSnapshot()
  const generations: Partial<Record<Table, number>> = {}
  function setTable(table: Table, state: TableState, rows?: unknown[]) {
    snapshot = {
      data: rows === undefined ? snapshot.data : ({ ...snapshot.data, [table]: rows } as Data),
      tables: { ...snapshot.tables, [table]: state },
    }
    publish(snapshot)
  }
  return {
    getSnapshot: () => snapshot,
    reset() {
      for (const table of ALL_TABLES) generations[table] = (generations[table] || 0) + 1
      snapshot = initialTableSnapshot()
      publish(snapshot)
    },
    async refresh(tables: Table[] = ALL_TABLES) {
      await Promise.allSettled(
        [...new Set(tables)].map(async (table) => {
          const id = (generations[table] = (generations[table] || 0) + 1)
          setTable(table, { ...snapshot.tables[table], loading: true })
          try {
            const rows = await load(table)
            if (generations[table] !== id) return
            setTable(table, { loaded: true, loading: false, error: '' }, rows)
          } catch (error) {
            if (generations[table] !== id) return
            setTable(table, { ...snapshot.tables[table], loading: false, error: messageOf(error) })
          }
        }),
      )
    },
  }
}
const updateDependencies: Partial<Record<Table, Table[]>> = {
  meetings: ['meeting_changes'],
}
export async function updateAndRefresh(
  table: Table,
  mutate: () => Promise<void>,
  refresh: (tables: Table[]) => Promise<void>,
) {
  await mutate()
  await refresh([table, ...(updateDependencies[table] || [])])
}
