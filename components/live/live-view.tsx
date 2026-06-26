'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Clock, Radio, Sparkles, Music2 } from 'lucide-react'
import type { FestivalData, SlotWithStage } from '@/types'
import { cn } from '@/lib/utils'
import { useNow } from '@/hooks/use-now'
import { useReminders } from '@/hooks/use-reminders'
import {
  festivalBounds,
  flaggedNow,
  flaggedUpcoming,
  stageStateAt,
} from '@/lib/live'
import { formatCountdown, formatDayLabel, formatTime, spanEnd, spanStart } from '@/lib/time'

interface LiveViewProps {
  data: FestivalData
}

export function LiveView({ data }: LiveViewProps) {
  const realNow = useNow(1000)
  const [previewMs, setPreviewMs] = useState<number | null>(null)
  const bounds = useMemo(() => festivalBounds(data.slots), [data.slots])
  const reminders = useReminders(data.slots)

  const isLive = previewMs === null
  const nowMs = previewMs ?? realNow?.getTime() ?? null

  // If the festival isn't happening right now, drop into preview at a lively
  // moment (first evening) so the live view is always demonstrable.
  useEffect(() => {
    if (!realNow || !bounds) {
      return
    }
    const real = realNow.getTime()
    const within = real >= bounds.min && real <= bounds.max
    if (!within && previewMs === null) {
      const firstEvening = Math.min(bounds.min + 8 * 60 * 60 * 1000, bounds.max)
      setPreviewMs(firstEvening)
    }
    // Only runs meaningfully once after the clock mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realNow, bounds])

  if (nowMs === null) {
    return <LiveSkeleton festivalName={data.festival.name} />
  }

  const nowPlaying = flaggedNow(data.slots, nowMs)
  const upcoming = flaggedUpcoming(data.slots, nowMs)
  const nextUp = upcoming[0] ?? null

  // Reminder count is based on real time (not the preview scrubber).
  const reminderCount = realNow
    ? flaggedUpcoming(data.slots, realNow.getTime() + reminders.leadMinutes * 60000).length
    : 0
  const stageStates = data.stages
    .map((stage) => stageStateAt(stage, data.slots, nowMs))
    .filter((state) => state.current || state.next)

  const currentDay = new Date(nowMs)
  const dayLabel = formatDayLabel(
    `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`,
  )

  return (
    <div className='px-4 pb-6 pt-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-heading text-4xl tracking-wide text-foreground'>{data.festival.name}</h1>
          <p className='mt-0.5 text-sm text-muted-foreground'>{dayLabel}</p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
            isLive ? 'bg-red-500/15 text-red-400' : 'bg-stagr-amber/15 text-stagr-amber',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', isLive ? 'animate-pulse bg-red-500' : 'bg-stagr-amber')} />
          {isLive ? 'LIVE' : 'PREVIEW'}
          <span className='tabular-nums'>
            {String(currentDay.getHours()).padStart(2, '0')}:{String(currentDay.getMinutes()).padStart(2, '0')}
          </span>
        </div>
      </div>

      {bounds ? (
        <PreviewControls
          bounds={bounds}
          previewMs={previewMs}
          nowMs={nowMs}
          isLive={isLive}
          onScrub={(value) => setPreviewMs(value)}
          onGoLive={() => setPreviewMs(null)}
          canGoLive={Boolean(realNow && realNow.getTime() >= bounds.min && realNow.getTime() <= bounds.max)}
        />
      ) : null}

      {reminders.permission !== 'unsupported' ? (
        <button
          type='button'
          onClick={reminders.toggle}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
            reminders.enabled
              ? 'border-stagr-amber/50 bg-stagr-amber/10 text-stagr-amber'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {reminders.enabled ? <Bell className='h-4 w-4' /> : <BellOff className='h-4 w-4' />}
          {reminders.permission === 'denied'
            ? 'Reminders blocked in browser settings'
            : reminders.enabled
              ? `Reminders on · ${reminderCount} upcoming`
              : 'Remind me before my sets'}
        </button>
      ) : null}

      {/* NOW */}
      <section className='mt-6'>
        <SectionLabel icon={Radio} label='Now' />
        {nowPlaying.length > 0 ? (
          <div className='mt-2 space-y-2'>
            {nowPlaying.map((slot) => (
              <NowCard key={slot.id} slot={slot} nowMs={nowMs} />
            ))}
          </div>
        ) : (
          <p className='mt-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-5 text-center text-sm text-muted-foreground'>
            None of your flagged acts are playing right now.
          </p>
        )}
      </section>

      {/* NEXT UP */}
      <section className='mt-6'>
        <SectionLabel icon={Sparkles} label='Next up' />
        {nextUp ? (
          <NextUpCard slot={nextUp} nowMs={nowMs} />
        ) : (
          <p className='mt-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-5 text-center text-sm text-muted-foreground'>
            No more flagged acts {isLive ? 'today' : 'after this point'}.
          </p>
        )}
      </section>

      {/* ALL STAGES */}
      <section className='mt-6'>
        <SectionLabel icon={Music2} label='All stages' />
        {stageStates.length > 0 ? (
          <div className='mt-2 space-y-2'>
            {stageStates.map(({ stage, current, next }) => (
              <div key={stage.id} className='rounded-xl border border-border bg-card p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {stage.name}
                </p>
                <div className='mt-1.5 flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    {current ? (
                      <p className='truncate text-base font-semibold text-foreground'>
                        {current.is_flagged ? '★ ' : ''}
                        {current.band_name}
                      </p>
                    ) : (
                      <p className='text-sm text-muted-foreground'>Stage quiet</p>
                    )}
                    {next ? (
                      <p className='truncate text-xs text-muted-foreground'>
                        Next: {next.band_name} · {formatTime(next.start_time)}
                      </p>
                    ) : null}
                  </div>
                  {current ? (
                    <span className='shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-foreground'>
                      ends {formatCountdown(spanEnd(current).getTime() - nowMs)}
                    </span>
                  ) : next ? (
                    <span className='shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground'>
                      in {formatCountdown(spanStart(next).getTime() - nowMs)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='mt-2 text-center text-sm text-muted-foreground'>Nothing scheduled around this time.</p>
        )}
      </section>
    </div>
  )
}

function SectionLabel({ icon: Icon, label }: { icon: typeof Radio; label: string }) {
  return (
    <div className='flex items-center gap-2'>
      <Icon className='h-4 w-4 text-stagr-amber' />
      <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{label}</h2>
    </div>
  )
}

function NowCard({ slot, nowMs }: { slot: SlotWithStage; nowMs: number }) {
  const endsIn = spanEnd(slot).getTime() - nowMs
  return (
    <div className='rounded-2xl border border-stagr-amber/50 bg-stagr-amber/10 p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='font-heading text-3xl leading-tight tracking-wide text-foreground'>{slot.band_name}</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            {slot.stage.name} · until {formatTime(slot.end_time)}
          </p>
        </div>
        <div className='shrink-0 text-right'>
          <p className='text-2xl font-bold tabular-nums text-stagr-amber'>{formatCountdown(endsIn)}</p>
          <p className='text-[10px] uppercase tracking-wide text-muted-foreground'>left</p>
        </div>
      </div>
    </div>
  )
}

function NextUpCard({ slot, nowMs }: { slot: SlotWithStage; nowMs: number }) {
  const startsIn = spanStart(slot).getTime() - nowMs
  return (
    <div className='mt-2 rounded-2xl border border-border bg-card p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xl font-semibold text-foreground'>{slot.band_name}</p>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            {slot.stage.name} · {formatTime(slot.start_time)}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm font-semibold tabular-nums text-foreground'>
          <Clock className='h-4 w-4 text-stagr-amber' />
          {formatCountdown(startsIn)}
        </div>
      </div>
    </div>
  )
}

interface PreviewControlsProps {
  bounds: { min: number; max: number }
  previewMs: number | null
  nowMs: number
  isLive: boolean
  canGoLive: boolean
  onScrub: (value: number) => void
  onGoLive: () => void
}

function PreviewControls({ bounds, nowMs, isLive, canGoLive, onScrub, onGoLive }: PreviewControlsProps) {
  return (
    <div className='mt-4 rounded-xl border border-border bg-card/60 p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-muted-foreground'>
          {isLive ? 'Showing real time' : 'Scrub through the festival'}
        </span>
        {canGoLive && !isLive ? (
          <button
            type='button'
            onClick={onGoLive}
            className='rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-400'
          >
            Go live
          </button>
        ) : null}
      </div>
      <input
        type='range'
        min={bounds.min}
        max={bounds.max}
        step={60000}
        value={nowMs}
        onChange={(event) => onScrub(Number(event.target.value))}
        className='mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-stagr-amber'
        aria-label='Preview time'
      />
    </div>
  )
}

function LiveSkeleton({ festivalName }: { festivalName: string }) {
  return (
    <div className='px-4 pt-4'>
      <h1 className='font-heading text-4xl tracking-wide text-foreground'>{festivalName}</h1>
      <div className='mt-6 space-y-3'>
        <div className='h-24 animate-pulse rounded-2xl bg-card' />
        <div className='h-20 animate-pulse rounded-2xl bg-card' />
        <div className='h-16 animate-pulse rounded-2xl bg-card' />
      </div>
    </div>
  )
}
