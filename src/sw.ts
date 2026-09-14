/// <reference lib="webworker" />
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; href?: string; id?: string } = {}
  try {
    payload = event.data?.json() || {}
  } catch {
    payload = { body: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'PULSO', {
      body: payload.body || 'Hay novedades en tu equipo.',
      icon: new URL('icon-192.png', self.registration.scope).href,
      badge: new URL('icon-192.png', self.registration.scope).href,
      tag: payload.id || 'pulso',
      data: { href: payload.href || '/' },
    }),
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = String(event.notification.data?.href || '/')
  const target = new URL(`${self.registration.scope}#${href.startsWith('/') ? href : '/'}`)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          await (client as WindowClient).navigate(target.href)
          return (client as WindowClient).focus()
        }
      }
      return self.clients.openWindow(target.href)
    })(),
  )
})
