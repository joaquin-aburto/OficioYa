const LOGO = 'https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch {}

  const title = data.title || 'OficioYa'
  const urgente = !!data.tag?.startsWith('urg-')

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: LOGO,
      badge: '/badge-72.png',            // ver nota abajo
      tag: data.tag,
      renotify: !!data.tag,              // renotify exige que haya tag, si no lanza error
      vibrate: urgente ? [500, 200, 500] : [200, 100, 200],
      data: { url: data.url || '/cliente/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus() }
      }
      return clients.openWindow(url)
    })
  )
})