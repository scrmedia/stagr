// Stagr service worker — offline app shell + runtime caching.
const CACHE = 'stagr-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }
  // Never cache auth or API traffic.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
    return
  }

  // Network-first for page navigations; fall back to cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone())
          return response
        } catch {
          const cached = await caches.match(request)
          return cached || (await caches.match('/home')) || Response.error()
        }
      })(),
    )
    return
  }

  // Cache-first for build assets and icons.
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) {
          return cached
        }
        const response = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put(request, response.clone())
        return response
      })(),
    )
  }
})

// Focus or open the app when a reminder notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = allClients.find((client) => client.url.includes('/home'))
      if (existing) {
        return existing.focus()
      }
      return self.clients.openWindow('/home')
    })(),
  )
})
