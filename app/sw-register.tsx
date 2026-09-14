'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // La app funciona normalmente aunque el registro offline no esté disponible.
      })
    }
  }, [])

  return null
}
