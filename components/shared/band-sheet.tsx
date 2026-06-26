'use client'

import { useEffect } from 'react'
import { AlertTriangle, Clock, Heart, MapPin, X } from 'lucide-react'
import type { SlotWithStage } from '@/types'
import { cn } from '@/lib/utils'
import { formatDayLabel, formatDuration, formatTime, durationMinutes } from '@/lib/time'

interface BandSheetProps {
  slot: SlotWithStage
  clashes: SlotWithStage[]
  busy: boolean
  onToggleFlag: (slot: SlotWithStage) => void
  onClose: () => void
}

export function BandSheet({ slot, clashes, busy, onToggleFlag, onClose }: BandSheetProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <button
        type='button'
        aria-label='Close'
        onClick={onClose}
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
      />
      <div className='relative w-full max-w-2xl animate-in slide-in-from-bottom rounded-t-3xl border-t border-border bg-card p-5 pb-8'>
        <div className='mx-auto mb-4 h-1.5 w-12 rounded-full bg-border' />
        <button
          type='button'
          onClick={onClose}
          className='absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted'
          aria-label='Close detail'
        >
          <X className='h-5 w-5' />
        </button>

        <h2 className='pr-10 font-heading text-4xl leading-tight tracking-wide text-foreground'>
          {slot.band_name}
        </h2>

        <div className='mt-4 space-y-2 text-sm'>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <MapPin className='h-4 w-4 shrink-0 text-stagr-amber' />
            <span className='text-foreground'>{slot.stage.name}</span>
          </div>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Clock className='h-4 w-4 shrink-0 text-stagr-amber' />
            <span className='text-foreground'>
              {formatDayLabel(slot.day)} · {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
            </span>
            <span className='text-muted-foreground'>({formatDuration(durationMinutes(slot))})</span>
          </div>
        </div>

        {clashes.length > 0 ? (
          <div className='mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3'>
            <div className='flex items-center gap-2 text-sm font-semibold text-destructive'>
              <AlertTriangle className='h-4 w-4' />
              Clashes with {clashes.length} flagged {clashes.length === 1 ? 'act' : 'acts'}
            </div>
            <ul className='mt-2 space-y-1 text-sm text-foreground/90'>
              {clashes.map((clash) => (
                <li key={clash.id}>
                  {clash.band_name}{' '}
                  <span className='text-muted-foreground'>
                    · {clash.stage.name} · {formatTime(clash.start_time)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type='button'
          onClick={() => onToggleFlag(slot)}
          disabled={busy}
          className={cn(
            'mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:opacity-60',
            slot.is_flagged
              ? 'bg-stagr-amber text-stagr-night'
              : 'border border-stagr-amber/60 text-stagr-amber hover:bg-stagr-amber/10',
          )}
        >
          <Heart className={cn('h-5 w-5', slot.is_flagged && 'fill-current')} />
          {slot.is_flagged ? 'In your lineup' : 'Add to lineup'}
        </button>
      </div>
    </div>
  )
}
