import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, DM_Sans } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/app/service-worker-register'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stagr.band'
const siteDescription = 'Import festival lineups with AI, resolve clashes, and track your day live.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Stagr — Festival Clashfinder', template: '%s · Stagr' },
  description: siteDescription,
  applicationName: 'Stagr',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stagr',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Stagr',
    title: 'Stagr — Festival Clashfinder',
    description: siteDescription,
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'Stagr — Festival Clashfinder',
    description: siteDescription,
  },
}

export const viewport: Viewport = {
  themeColor: '#111008',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className={`dark ${dmSans.variable} ${bebasNeue.variable}`}>
      <body className='min-h-screen bg-background font-sans text-foreground antialiased'>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
