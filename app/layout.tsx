import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stagr',
  description: 'Festival clashfinder and live day companion',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className='dark'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link
          href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@100..1000&display=swap'
          rel='stylesheet'
        />
      </head>
      <body className='min-h-screen bg-background font-sans text-foreground antialiased'>
        {children}
      </body>
    </html>
  )
}
