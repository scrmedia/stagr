import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarClock, Radio, ScanLine, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const features = [
  { icon: ScanLine, title: 'AI lineup import', description: 'Paste set times or snap the poster — we build your grid in seconds.' },
  { icon: CalendarClock, title: 'Clashfinder', description: 'Flag the acts you want and instantly see what clashes.' },
  { icon: Radio, title: 'Live day mode', description: 'Now, next up and every stage at a glance with live countdowns.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/home')
  }

  return (
    <main className='relative min-h-screen overflow-hidden'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,214,0,0.14),_transparent_55%)]' />

      <div className='relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10'>
        <header className='flex items-center justify-between'>
          <span className='font-heading text-2xl tracking-[0.18em] text-stagr-amber'>STAGR</span>
          <Link href='/login' className='text-sm font-medium text-muted-foreground hover:text-foreground'>
            Sign in
          </Link>
        </header>

        <div className='flex flex-1 flex-col justify-center py-12'>
          <span className='inline-flex w-fit items-center gap-1.5 rounded-full border border-stagr-amber/30 bg-stagr-amber/10 px-3 py-1 text-xs font-medium text-stagr-amber'>
            <Sparkles className='h-3.5 w-3.5' /> Your festival, sorted
          </span>
          <h1 className='mt-5 font-heading text-7xl leading-[0.95] tracking-wide text-foreground'>
            Never miss
            <br />
            the <span className='text-stagr-amber'>set</span> again
          </h1>
          <p className='mt-4 max-w-sm text-base text-muted-foreground'>
            Import any festival lineup with AI, flag the acts you love, resolve every clash, and
            track your day live on the ground.
          </p>

          <Link
            href='/login'
            className='mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-stagr-amber px-6 text-base font-semibold text-stagr-night transition-opacity hover:opacity-90'
          >
            Get started — it&apos;s free
          </Link>
        </div>

        <div className='space-y-3 pb-6'>
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className='flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stagr-amber/15'>
                <Icon className='h-5 w-5 text-stagr-amber' />
              </div>
              <div>
                <p className='font-semibold text-foreground'>{title}</p>
                <p className='text-sm text-muted-foreground'>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
