import { supabase } from './supabase'
import { VAPID_PUBLIC_KEY } from './config'
export const supportsPush = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window
export async function enablePush(userId: string) {
  if (!supportsPush())
    throw new Error(
      'Este navegador no permite notificaciones push. Probá con Chrome o Edge actualizado.',
    )
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY
  if (!key)
    throw new Error(
      'Las notificaciones del dispositivo todavía no están configuradas. Los avisos siguen disponibles en la campana de PULSO.',
    )
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw new Error(
      'Necesitamos tu permiso para mostrar notificaciones. Podés cambiarlo en la configuración del navegador.',
    )
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Instalá o recargá la app para activar las notificaciones.')),
        10000,
      ),
    ),
  ])
  const encoded = key.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }))
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint: subscription.endpoint, subscription: subscription.toJSON() },
      { onConflict: 'endpoint' },
    )
  if (error) {
    await subscription.unsubscribe()
    throw error
  }
  return true
}
export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration()
  const s = await registration?.pushManager.getSubscription()
  if (s) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
    await s.unsubscribe()
    if (error) throw error
  }
}
