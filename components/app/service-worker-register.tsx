'use client'

import { useEffect } from 'react'

/** Registers the service worker for offline support. Production only to avoid clashing with dev HMR. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || typeof navigator === 'undefined') {
      return
    }
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      if (document.readyState === 'complete') {
        register()
      } else {
        window.addEventListener('load', register, { once: true })
      }
    }
  }, [])

  return null
}
