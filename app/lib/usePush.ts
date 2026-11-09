'use client'
import { useCallback, useEffect, useState } from 'react'

const urlBase64ToUint8Array = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePush(usuarioId: number | null) {
  const [soportado, setSoportado] = useState(false)
  const [permiso, setPermiso] = useState<NotificationPermission>('default')
  const [activo, setActivo] = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSoportado(ok)
    if (!ok) return
    setPermiso(Notification.permission)
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setActivo(!!sub)
    })
  }, [])

  const activar = useCallback(async () => {
    if (!usuarioId || !soportado) return false
    const p = await Notification.requestPermission()
    setPermiso(p)
    if (p !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      }))

    const res = await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, suscripcion: sub.toJSON() }),
    })
    setActivo(res.ok)
    return res.ok
  }, [usuarioId, soportado])

  const desactivar = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/suscribir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setActivo(false)
  }, [])

  return { soportado, permiso, activo, activar, desactivar }
}