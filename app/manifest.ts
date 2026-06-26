import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stagr — Festival Clashfinder',
    short_name: 'Stagr',
    description: 'Import festival lineups with AI, resolve clashes, and track your day live.',
    start_url: '/home',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#111008',
    theme_color: '#111008',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
