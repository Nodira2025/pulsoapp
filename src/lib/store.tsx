import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { disablePush, supportsPush } from './push'
import { type Data, type Table, type Profile } from './types'
import {
  ALL_TABLES,
  createTableLoader,
  initialTableSnapshot,
  tableErrors,
  updateAndRefresh,
  type TableStates,
} from './tableStore'
import { messageOf } from './utils'

type Store = {
  session: Session | null
  user: Profile | null
  data: Data
  loading: boolean
  error: string
  tableStates: TableStates
  refresh: (tables?: Table[]) => Promise<void>
  insert: (table: Table, values: Record<string, unknown>) => Promise<any>
  update: (table: Table, id: string, values: Record<string, unknown>) => Promise<void>
  toast: (s: string) => void
  signOut: () => Promise<void>
}
const PAGE_SIZE = 1000
// Una tabla completa, paginada. Las filas se devuelven en el mismo orden que antes.
async function loadTable(table: Table): Promise<unknown[]> {
  let rows: unknown[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('*')
    if (table === 'reactions') query = query.order('post_id').order('user_id')
    else query = query.order('created_at', { ascending: false }).order('id')
    const { data: r, error: e } = await query.range(from, from + PAGE_SIZE - 1)
    if (e) throw e
    rows = rows.concat(r || [])
    if ((r?.length || 0) < PAGE_SIZE) return rows
  }
}
const Context = createContext<Store>(null!)
export const useStore = () => useContext(Context)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [snapshot, setSnapshot] = useState(initialTableSnapshot),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState('')
  const [loader] = useState(() => createTableLoader(loadTable, setSnapshot))
  const { data, tables: tableStates } = snapshot
  const error = tableErrors(tableStates)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined),
    authGeneration = useRef(0),
    lastFull = useRef(0)
  const reset = useCallback(() => {
    authGeneration.current++
    loader.reset()
    setLoading(false)
  }, [loader])
  const toast = useCallback((s: string) => {
    setNotice(s)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(''), 4500)
  }, [])
  const refresh = useCallback(
    async (tables: Table[] = ALL_TABLES) => {
      const full = tables.length === ALL_TABLES.length
      const generation = authGeneration.current
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      if (generation !== authGeneration.current) return
      if (!currentSession) {
        reset()
        return
      }
      if (full) lastFull.current = Date.now()
      await loader.refresh(tables)
      if (full && generation === authGeneration.current) setLoading(false)
    },
    [loader, reset],
  )
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      void refresh()
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      if (!s) {
        reset()
      } else setTimeout(() => void refresh(), 0)
    })
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer.current)
    }
  }, [refresh, reset])
  useEffect(() => {
    if (!session) return
    let debounce: ReturnType<typeof setTimeout>
    const pending = new Set<Table>()
    const flush = () => {
      const tables = [...pending]
      pending.clear()
      if (tables.length) void refresh(tables)
    }
    const channel = supabase
      .channel('pulso-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table as Table
        if (ALL_TABLES.includes(table)) pending.add(table)
        clearTimeout(debounce)
        debounce = setTimeout(flush, 300)
      })
      .subscribe()
    // Red de seguridad por si el tiempo real se corta (por ejemplo en segundo plano en el celular).
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 180000)
    const online = () => void refresh()
    const focus = () => {
      if (Date.now() - lastFull.current > 30000) void refresh()
    }
    window.addEventListener('online', online)
    window.addEventListener('focus', focus)
    return () => {
      clearTimeout(debounce)
      clearInterval(interval)
      window.removeEventListener('online', online)
      window.removeEventListener('focus', focus)
      void supabase.removeChannel(channel)
    }
  }, [session?.user.id, refresh])
  const insert = async (table: Table, values: Record<string, unknown>) => {
    const { data: row, error: e } = await supabase.from(table).insert(values).select().single()
    if (e) throw e
    await refresh([table])
    return row
  }
  const update = async (table: Table, id: string, values: Record<string, unknown>) => {
    await updateAndRefresh(
      table,
      async () => {
        const { data: rows, error: e } = await supabase
          .from(table)
          .update(values)
          .eq('id', id)
          .select('id')
        if (e) throw e
        if (!rows?.length) throw new Error('No tenés permiso para modificar este registro.')
      },
      refresh,
    )
  }
  const signOut = async () => {
    if (supportsPush()) {
      try {
        await disablePush()
      } catch {
        /* The browser subscription is removed even if remote cleanup is unavailable. */
      }
    }
    const { error: e } = await supabase.auth.signOut()
    if (e) toast(messageOf(e))
    else {
      for (const k of Object.keys(localStorage))
        if (k.startsWith('pulso-draft-')) localStorage.removeItem(k)
    }
  }
  return (
    <Context.Provider
      value={{
        session,
        user: data.profiles.find((p) => p.id === session?.user.id) || null,
        data,
        loading,
        error,
        tableStates,
        refresh,
        insert,
        update,
        toast,
        signOut,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Context.Provider>
  )
}
