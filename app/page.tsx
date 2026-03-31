import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center'>
      <h1 className='font-heading text-8xl tracking-[0.12em] text-stagr-amber'>STAGR</h1>
      <Link
        href='/login'
        className='min-h-11 min-w-44 rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90'
      >
        Get started
      </Link>
    </main>
  )
}
