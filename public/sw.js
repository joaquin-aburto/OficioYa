self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch {}
  const title = data.title || 'OficioYa'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: 'https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png',
      badge: 'https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png',
      tag: data.tag,
      data: { url: data.url || '/cliente/dashboard' },
    })
  )
})

const urgente = data.tag?.startsWith('urg-')

self.registration.showNotification(title, {
  body: data.body || '',
 icon: 'https://jqhlnwusmwtqxxvtitht.supabase.co/storage/v1/object/public/ImagesOficioYa/OficioYa/Logo/LogoOficioYa-Log.png',
  tag: data.tag,
  renotify: true,
  vibrate: urgente ? [500, 200, 500] : [200, 100, 200],
  data: { url: data.url || '/cliente/dashboard' },
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