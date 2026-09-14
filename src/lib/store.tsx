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
import { emptyData, type Data, type Table, type Profile } from './types'
import { messageOf } from './utils'

type Store = {
  session: Session | null
  user: Profile | null
  data: Data
  loading: boolean
  error: string
  refresh: () => Promise<void>
  insert: (table: Table, values: Record<string, unknown>) => Promise<any>
  update: (table: Table, id: string, values: Record<string, unknown>) => Promise<void>
  toast: (s: string) => void
  signOut: () => Promise<void>
}
const Context = createContext<Store>(null!)
export const useStore = () => useContext(Context)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [data, setData] = useState<Data>(emptyData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined),
    generation = useRef(0)
  const toast = useCallback((s: string) => {
    setNotice(s)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(''), 4500)
  }, [])
  const refresh = useCallback(async () => {
    const request = ++generation.current
    const {
      data: { session: s },
    } = await supabase.auth.getSession()
    if (!s) {
      setData(emptyData)
      setLoading(false)
      return
    }
    try {
      const tables = Object.keys(emptyData) as Table[]
      const results = await Promise.all(
        tables.map(async (table) => {
          let rows: unknown[] = []
          let from = 0
          for (;;) {
            let query = supabase.from(table).select('*')
            if (table === 'reactions') query = query.order('post_id').order('user_id')
            else query = query.order('created_at', { ascending: false }).order('id')
            const { data: r, error: e } = await query.range(from, from + 999)
            if (e) throw e
            rows = rows.concat(r || [])
            if ((r?.length || 0) < 1000) break
            from += 1000
          }
          return [table, rows]
        }),
      )
      if (request === generation.current) {
        setData(Object.fromEntries(results) as unknown as Data)
        setError('')
      }
    } catch (e) {
      if (request === generation.current) setError(messageOf(e))
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [])
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
        ++generation.current
        setData(emptyData)
        setLoading(false)
      } else setTimeout(() => void refresh(), 0)
    })
    return () => {
      subscription.unsubscribe()
      clearTimeout(timer.current)
    }
  }, [refresh])
  useEffect(() => {
    if (!session) return
    let debounce: ReturnType<typeof setTimeout>
    const channel = supabase
      .channel('pulso-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(debounce)
        debounce = setTimeout(() => void refresh(), 300)
      })
      .subscribe()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 45000)
    const online = () => void refresh()
    window.addEventListener('online', online)
    window.addEventListener('focus', online)
    return () => {
      clearTimeout(debounce)
      clearInterval(interval)
      window.removeEventListener('online', online)
      window.removeEventListener('focus', online)
      void supabase.removeChannel(channel)
    }
  }, [session?.user.id, refresh])
  const insert = async (table: Table, values: Record<string, unknown>) => {
    const { data: row, error: e } = await supabase.from(table).insert(values).select().single()
    if (e) throw e
    await refresh()
    return row
  }
  const update = async (table: Table, id: string, values: Record<string, unknown>) => {
    const { data: rows, error: e } = await supabase
      .from(table)
      .update(values)
      .eq('id', id)
      .select('id')
    if (e) throw e
    if (!rows?.length) throw new Error('No tenés permiso para modificar este registro.')
    await refresh()
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
