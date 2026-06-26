'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, LogOut, Plus, Settings, Sparkles, CalendarDays } from 'lucide-react'
import type { Festival } from '@/types'
import { cn } from '@/lib/utils'
import { setActiveFestival, signOut } from '@/app/actions'

interface AppHeaderProps {
  festivals: Festival[]
  activeFestivalId: string | null
  userEmail: string
  isPremium: boolean
}

export function AppHeader({ festivals, activeFestivalId, userEmail, isPremium }: AppHeaderProps) {
  const router = useRouter()
  const [festivalMenuOpen, setFestivalMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const festivalRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  const activeFestival = festivals.find((festival) => festival.id === activeFestivalId) ?? festivals[0] ?? null

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (festivalRef.current && !festivalRef.current.contains(event.target as Node)) {
        setFestivalMenuOpen(false)
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (festivalId: string) => {
    setFestivalMenuOpen(false)
    if (festivalId === activeFestivalId) {
      return
    }
    startTransition(async () => {
      await setActiveFestival(festivalId)
      router.refresh()
    })
  }

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-2xl items-center justify-between px-4'>
        <div className='relative' ref={festivalRef}>
          {activeFestival ? (
            <button
              type='button'
              onClick={() => setFestivalMenuOpen((open) => !open)}
              className='flex max-w-[60vw] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted'
            >
              <span className='truncate font-heading text-xl tracking-wide text-foreground'>
                {activeFestival.name}
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', festivalMenuOpen && 'rotate-180')} />
            </button>
          ) : (
            <Link href='/' className='font-heading text-2xl tracking-[0.14em] text-stagr-amber'>
              STAGR
            </Link>
          )}

          {festivalMenuOpen ? (
            <div className='absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl'>
              <p className='px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Your festivals
              </p>
              <ul className='max-h-72 overflow-y-auto py-1'>
                {festivals.map((festival) => (
                  <li key={festival.id}>
                    <button
                      type='button'
                      onClick={() => handleSelect(festival.id)}
                      disabled={isPending}
                      className='flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60'
                    >
                      <CalendarDays className='h-4 w-4 shrink-0 text-muted-foreground' />
                      <span className='flex-1 truncate text-foreground'>{festival.name}</span>
                      {festival.id === activeFestival?.id ? (
                        <Check className='h-4 w-4 shrink-0 text-stagr-amber' />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <div className='border-t border-border'>
                <Link
                  href='/festival/new'
                  onClick={() => setFestivalMenuOpen(false)}
                  className='flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-stagr-amber transition-colors hover:bg-muted'
                >
                  <Plus className='h-4 w-4' />
                  New festival
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className='flex items-center gap-2'>
          {activeFestival ? (
            <Link
              href={`/festival/${activeFestival.id}`}
              className='flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              aria-label='Festival settings'
            >
              <Settings className='h-5 w-5' />
            </Link>
          ) : null}

          <div className='relative' ref={accountRef}>
            <button
              type='button'
              onClick={() => setAccountMenuOpen((open) => !open)}
              className='flex h-9 w-9 items-center justify-center rounded-full bg-stagr-amber text-sm font-bold text-stagr-night'
              aria-label='Account menu'
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>

            {accountMenuOpen ? (
              <div className='absolute right-0 top-full mt-1 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl'>
                <div className='px-3 py-3'>
                  <p className='truncate text-sm font-medium text-foreground'>{userEmail}</p>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      isPremium
                        ? 'bg-stagr-amber/15 text-stagr-amber'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isPremium ? <Sparkles className='h-3 w-3' /> : null}
                    {isPremium ? 'Premium' : 'Free plan'}
                  </span>
                </div>
                <div className='border-t border-border'>
                  <form action={signOut}>
                    <button
                      type='submit'
                      className='flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted'
                    >
                      <LogOut className='h-4 w-4' />
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
