'use client'

import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, Clock, Heart } from 'lucide-react'
import type { FestivalData, SlotWithStage } from '@/types'
import { cn } from '@/lib/utils'
import { postFlag } from '@/lib/client-api'
import { clashesFor, findClashingSlotIds } from '@/lib/clash'
import { durationMinutes, formatDayLabel, formatDuration, formatTime, spanEnd, spanStart } from '@/lib/time'
import { BandSheet } from '@/components/shared/band-sheet'

interface LineupViewProps {
  data: FestivalData
}

export function LineupView({ data }: LineupViewProps) {
  const [slots, setSlots] = useState<SlotWithStage[]>(data.slots)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const festivalId = data.festival.id

  const persistFlag = useCallback(
    async (slotId: string, next: boolean) => {
      setBusyId(slotId)
      try {
        await postFlag(slotId, festivalId, next)
      } catch {
        setSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, is_flagged: !next } : slot)))
      } finally {
        setBusyId(null)
      }
    },
    [festivalId],
  )

  const toggleFlag = useCallback(
    (slotId: string) => {
      setSlots((prev) => {
        const target = prev.find((slot) => slot.id === slotId)
        if (!target) {
          return prev
        }
        const next = !target.is_flagged
        void persistFlag(slotId, next)
        return prev.map((slot) => (slot.id === slotId ? { ...slot, is_flagged: next } : slot))
      })
    },
    [persistFlag],
  )

  const flagged = useMemo(
    () =>
      slots
        .filter((slot) => slot.is_flagged)
        .sort((a, b) => spanStart(a).getTime() - spanStart(b).getTime()),
    [slots],
  )

  const clashingIds = useMemo(() => findClashingSlotIds(slots), [slots])

  const byDay = useMemo(() => {
    const groups = new Map<string, SlotWithStage[]>()
    for (const slot of flagged) {
      const list = groups.get(slot.day) ?? []
      list.push(slot)
      groups.set(slot.day, list)
    }
    return data.days.filter((day) => groups.has(day)).map((day) => ({ day, slots: groups.get(day) ?? [] }))
  }, [flagged, data.days])

  const selectedSlot = selectedSlotId ? slots.find((slot) => slot.id === selectedSlotId) ?? null : null

  return (
    <div className='px-4 pb-4 pt-4'>
      <div className='flex items-baseline justify-between'>
        <h1 className='font-heading text-4xl tracking-wide text-foreground'>My Lineup</h1>
        <span className='text-sm text-muted-foreground'>
          {flagged.length} {flagged.length === 1 ? 'act' : 'acts'}
        </span>
      </div>

      {clashingIds.size > 0 ? (
        <div className='mt-3 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          <AlertTriangle className='h-4 w-4 shrink-0' />
          {clashingIds.size} of your picks clash. Tap a clashing act to resolve it.
        </div>
      ) : null}

      {flagged.length === 0 ? (
        <div className='mt-10 flex flex-col items-center text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
            <Heart className='h-8 w-8 text-stagr-amber' />
          </div>
          <h2 className='mt-5 font-heading text-2xl tracking-wide text-foreground'>Nothing flagged yet</h2>
          <p className='mt-2 max-w-xs text-sm text-muted-foreground'>
            Head to the Grid and tap the acts you want to see. They&apos;ll show up here in order.
          </p>
        </div>
      ) : (
        <div className='mt-5 space-y-8'>
          {byDay.map(({ day, slots: daySlots }) => (
            <section key={day}>
              <h2 className='sticky top-14 z-10 -mx-4 bg-background/90 px-4 py-1.5 font-heading text-xl tracking-wide text-stagr-amber backdrop-blur'>
                {formatDayLabel(day)}
              </h2>
              <ol className='mt-2 space-y-2'>
                {daySlots.map((slot, index) => {
                  const previous = index > 0 ? daySlots[index - 1] : null
                  const isClash = clashingIds.has(slot.id)
                  const gapNode = previous ? renderConnector(previous, slot) : null
                  return (
                    <li key={slot.id}>
                      {gapNode}
                      <button
                        type='button'
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={cn(
                          'flex w-full items-stretch gap-3 rounded-xl border p-3 text-left transition-colors',
                          isClash
                            ? 'border-destructive/50 bg-destructive/5'
                            : 'border-border bg-card hover:border-stagr-amber/50',
                        )}
                      >
                        <div className='flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-muted py-1'>
                          <span className='text-sm font-bold tabular-nums text-foreground'>
                            {formatTime(slot.start_time)}
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            {formatDuration(durationMinutes(slot))}
                          </span>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-base font-semibold text-foreground'>{slot.band_name}</p>
                          <p className='truncate text-sm text-muted-foreground'>{slot.stage.name}</p>
                          {isClash ? (
                            <span className='mt-1 inline-flex items-center gap-1 text-xs font-medium text-destructive'>
                              <AlertTriangle className='h-3 w-3' /> Clash
                            </span>
                          ) : null}
                        </div>
                        <Heart className='h-5 w-5 shrink-0 self-center fill-stagr-amber text-stagr-amber' />
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {selectedSlot ? (
        <BandSheet
          slot={selectedSlot}
          clashes={clashesFor(selectedSlot, slots)}
          busy={busyId === selectedSlot.id}
          onToggleFlag={(slot) => toggleFlag(slot.id)}
          onClose={() => setSelectedSlotId(null)}
        />
      ) : null}
    </div>
  )
}

/** Gap chip or overlap badge shown between two consecutive flagged acts. */
function renderConnector(previous: SlotWithStage, current: SlotWithStage) {
  const gapMs = spanStart(current).getTime() - spanEnd(previous).getTime()
  const gapMinutes = Math.round(gapMs / 60000)

  if (gapMinutes < 0) {
    return (
      <div className='flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-destructive'>
        <AlertTriangle className='h-3 w-3' />
        Overlaps previous by {formatDuration(Math.abs(gapMinutes))}
      </div>
    )
  }

  if (gapMinutes === 0) {
    return (
      <div className='flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground'>
        <ArrowDown className='h-3 w-3' />
        Back to back
      </div>
    )
  }

  return (
    <div className='flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground'>
      <Clock className='h-3 w-3' />
      {formatDuration(gapMinutes)} gap
    </div>
  )
}
