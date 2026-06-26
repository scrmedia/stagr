'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Heart } from 'lucide-react'
import type { FestivalData, SlotWithStage } from '@/types'
import { cn } from '@/lib/utils'
import { postFlag } from '@/lib/client-api'
import { clashesFor, findClashingSlotIds } from '@/lib/clash'
import { formatDayLabel, formatTime, timeToMinutes } from '@/lib/time'
import { BandSheet } from '@/components/shared/band-sheet'
import { DayTabs } from '@/components/shared/day-tabs'

interface FestivalGridProps {
  data: FestivalData
}

const HOUR_HEIGHT = 92 // px per hour → ~1.5px/min, keeps 45-min sets above 44px touch target
const COLUMN_WIDTH = 150 // px per stage column
const GUTTER_WIDTH = 44 // px for the time axis

/** Minutes from midnight, treating sets that start before 06:00 as the small hours of the same festival night. */
function startMinutes(slot: SlotWithStage): number {
  const minutes = timeToMinutes(slot.start_time)
  return minutes < 360 ? minutes + 1440 : minutes
}

function endMinutes(slot: SlotWithStage): number {
  const start = startMinutes(slot)
  let end = timeToMinutes(slot.end_time)
  if (end < 360) {
    end += 1440
  }
  return end <= start ? start + 30 : end
}

export function FestivalGrid({ data }: FestivalGridProps) {
  const [slots, setSlots] = useState<SlotWithStage[]>(data.slots)
  const [selectedDay, setSelectedDay] = useState<string>(data.days[0] ?? data.festival.start_date)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const tapRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  const festivalId = data.festival.id

  const persistFlag = useCallback(
    async (slotId: string, next: boolean) => {
      setBusyId(slotId)
      try {
        await postFlag(slotId, festivalId, next)
      } catch {
        setSlots((prev) =>
          prev.map((slot) => (slot.id === slotId ? { ...slot, is_flagged: !next } : slot)),
        )
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

  const handleSlotTap = useCallback(
    (slotId: string) => {
      const pending = tapRef.current
      if (pending && pending.id === slotId) {
        clearTimeout(pending.timer)
        tapRef.current = null
        setSelectedSlotId(slotId)
        return
      }
      if (pending) {
        clearTimeout(pending.timer)
      }
      const timer = setTimeout(() => {
        tapRef.current = null
        toggleFlag(slotId)
      }, 220)
      tapRef.current = { id: slotId, timer }
    },
    [toggleFlag],
  )

  const clashingIds = useMemo(() => findClashingSlotIds(slots), [slots])
  const daySlots = useMemo(() => slots.filter((slot) => slot.day === selectedDay), [slots, selectedDay])

  // Stages that actually have acts on the selected day, in display order.
  const dayStages = useMemo(() => {
    const present = new Set(daySlots.map((slot) => slot.stage_id))
    return data.stages.filter((stage) => present.has(stage.id))
  }, [data.stages, daySlots])

  const { earliest, latest } = useMemo(() => {
    if (daySlots.length === 0) {
      return { earliest: 12 * 60, latest: 24 * 60 }
    }
    let min = Infinity
    let max = -Infinity
    for (const slot of daySlots) {
      min = Math.min(min, startMinutes(slot))
      max = Math.max(max, endMinutes(slot))
    }
    // Snap to whole hours and guarantee at least a few hours of canvas.
    const flooredMin = Math.floor(min / 60) * 60
    const ceiledMax = Math.ceil(max / 60) * 60
    return { earliest: flooredMin, latest: Math.max(ceiledMax, flooredMin + 180) }
  }, [daySlots])

  const totalMinutes = latest - earliest
  const canvasHeight = (totalMinutes / 60) * HOUR_HEIGHT
  const hourLines = useMemo(() => {
    const lines: number[] = []
    for (let minute = earliest; minute <= latest; minute += 60) {
      lines.push(minute)
    }
    return lines
  }, [earliest, latest])

  const selectedSlot = selectedSlotId ? slots.find((slot) => slot.id === selectedSlotId) ?? null : null
  const flaggedCount = slots.filter((slot) => slot.is_flagged).length

  return (
    <div className='flex flex-col'>
      <div className='px-4 pb-2 pt-4'>
        <div className='flex items-baseline justify-between'>
          <h1 className='font-heading text-4xl tracking-wide text-foreground'>Grid</h1>
          <span className='text-sm text-muted-foreground'>
            {flaggedCount} flagged{clashingIds.size > 0 ? ` · ${clashingIds.size} clashing` : ''}
          </span>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>Tap to flag · double-tap for details</p>
      </div>

      <DayTabs days={data.days} selectedDay={selectedDay} onSelect={setSelectedDay} />

      {dayStages.length === 0 ? (
        <p className='px-4 py-16 text-center text-sm text-muted-foreground'>
          No acts on {formatDayLabel(selectedDay)} yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <div className='relative' style={{ width: GUTTER_WIDTH + dayStages.length * COLUMN_WIDTH }}>
            {/* Stage header row */}
            <div
              className='sticky top-14 z-20 flex border-b border-border bg-background/95 backdrop-blur'
              style={{ paddingLeft: GUTTER_WIDTH }}
            >
              {dayStages.map((stage) => (
                <div
                  key={stage.id}
                  className='shrink-0 truncate px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground'
                  style={{ width: COLUMN_WIDTH }}
                  title={stage.name}
                >
                  {stage.name}
                </div>
              ))}
            </div>

            {/* Grid canvas */}
            <div className='relative' style={{ height: canvasHeight }}>
              {/* Hour gridlines + labels */}
              {hourLines.map((minute) => {
                const top = ((minute - earliest) / 60) * HOUR_HEIGHT
                const hour = Math.floor((minute % 1440) / 60)
                return (
                  <div key={minute} className='absolute inset-x-0' style={{ top }}>
                    <div className='border-t border-border/60' />
                    <span className='absolute -top-2 left-0 w-11 pr-1 text-right text-[10px] tabular-nums text-muted-foreground'>
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                )
              })}

              {/* Stage columns with positioned slots */}
              <div className='absolute inset-0 flex' style={{ paddingLeft: GUTTER_WIDTH }}>
                {dayStages.map((stage) => {
                  const stageSlots = daySlots.filter((slot) => slot.stage_id === stage.id)
                  return (
                    <div
                      key={stage.id}
                      className='relative shrink-0 border-l border-border/40'
                      style={{ width: COLUMN_WIDTH }}
                    >
                      {stageSlots.map((slot) => {
                        const top = ((startMinutes(slot) - earliest) / 60) * HOUR_HEIGHT
                        const height = Math.max(
                          ((endMinutes(slot) - startMinutes(slot)) / 60) * HOUR_HEIGHT - 4,
                          34,
                        )
                        const isClash = clashingIds.has(slot.id)
                        return (
                          <button
                            key={slot.id}
                            type='button'
                            onClick={() => handleSlotTap(slot.id)}
                            className={cn(
                              'absolute left-1 right-1 overflow-hidden rounded-lg border p-1.5 text-left transition-colors',
                              slot.is_flagged
                                ? 'border-stagr-amber bg-stagr-amber/20'
                                : 'border-border bg-card hover:border-stagr-amber/50',
                              slot.confidence === 'low' && !slot.is_flagged && 'border-l-2 border-l-amber-400',
                              busyId === slot.id && 'opacity-60',
                            )}
                            style={{ top, height }}
                          >
                            <div className='flex items-start justify-between gap-1'>
                              <span className='text-[10px] tabular-nums text-muted-foreground'>
                                {formatTime(slot.start_time)}
                              </span>
                              {isClash ? (
                                <AlertTriangle className='h-3 w-3 shrink-0 text-destructive' />
                              ) : slot.is_flagged ? (
                                <Heart className='h-3 w-3 shrink-0 fill-stagr-amber text-stagr-amber' />
                              ) : null}
                            </div>
                            <p
                              className={cn(
                                'mt-0.5 line-clamp-2 text-xs font-semibold leading-tight',
                                slot.is_flagged ? 'text-foreground' : 'text-foreground/90',
                              )}
                            >
                              {slot.band_name}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
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
