'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NEW_FESTIVAL_DRAFT_KEY, type FestivalDraft } from '@/lib/drafts'
import { createFestival } from '@/lib/client-api'
import { setActiveFestival } from '@/app/actions'
import { durationMinutesFromTimes, formatDuration } from '@/lib/time'

type Draft = FestivalDraft

interface EditState {
  stageIndex: number
  slotIndex: number
  band_name: string
  start_time: string
  end_time: string
}

export default function ConfirmLineupPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [activeStage, setActiveStage] = useState(0)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem(NEW_FESTIVAL_DRAFT_KEY)
    if (!stored) {
      return
    }
    try {
      setDraft(JSON.parse(stored) as Draft)
    } catch {
      setError('Could not load the parsed lineup. Please import again.')
    }
  }, [])

  if (!draft) {
    return (
      <main className='px-4 py-10 text-center'>
        <h1 className='font-heading text-4xl tracking-wide text-stagr-amber'>Confirm lineup</h1>
        <p className='mt-4 text-sm text-muted-foreground'>
          No parsed lineup found. Go back and import a lineup first.
        </p>
        <button
          type='button'
          onClick={() => router.push('/festival/new')}
          className='mt-6 min-h-11 rounded-xl bg-stagr-amber px-6 font-semibold text-stagr-night'
        >
          Start import
        </button>
      </main>
    )
  }

  const stages = draft.parsed_lineup.stages
  const stage = stages[activeStage]
  const slotCount = stages.reduce((total, current) => total + current.slots.length, 0)
  const lowConfidenceCount = stages.reduce(
    (total, current) => total + current.slots.filter((slot) => slot.confidence === 'low').length,
    0,
  )

  const mutateStages = (updater: (stages: Draft['parsed_lineup']['stages']) => Draft['parsed_lineup']['stages']) => {
    setDraft((prev) =>
      prev ? { ...prev, parsed_lineup: { ...prev.parsed_lineup, stages: updater(prev.parsed_lineup.stages) } } : prev,
    )
  }

  const saveEdit = () => {
    if (!editing) {
      return
    }
    mutateStages((current) =>
      current.map((s, si) =>
        si !== editing.stageIndex
          ? s
          : {
              ...s,
              slots: s.slots.map((slot, sli) =>
                sli !== editing.slotIndex
                  ? slot
                  : {
                      ...slot,
                      band_name: editing.band_name,
                      start_time: editing.start_time,
                      end_time: editing.end_time,
                      confidence: 'high',
                    },
              ),
            },
      ),
    )
    setEditing(null)
  }

  const deleteSlot = (stageIndex: number, slotIndex: number) => {
    mutateStages((current) =>
      current.map((s, si) =>
        si !== stageIndex ? s : { ...s, slots: s.slots.filter((_, sli) => sli !== slotIndex) },
      ),
    )
    setEditing(null)
  }

  const addSlot = (stageIndex: number) => {
    mutateStages((current) =>
      current.map((s, si) =>
        si !== stageIndex
          ? s
          : {
              ...s,
              slots: [
                ...s.slots,
                {
                  band_name: 'New act',
                  day: draft.festival.start_date,
                  start_time: '12:00',
                  end_time: '12:45',
                  confidence: 'low' as const,
                },
              ],
            },
      ),
    )
  }

  const save = async () => {
    setError('')
    setIsSaving(true)
    try {
      const result = await createFestival({
        festival: draft.festival,
        lineup: draft.parsed_lineup,
      })

      if (!result.ok) {
        if (result.error === 'limit_reached') {
          setError('You’ve reached the free plan limit of 1 festival. Archive your current one or upgrade to premium.')
        } else if (result.error === 'unauthorized') {
          setError('Your session expired. Please sign in again.')
        } else {
          setError('Could not save your festival. Please try again.')
        }
        return
      }

      sessionStorage.removeItem(NEW_FESTIVAL_DRAFT_KEY)
      await setActiveFestival(result.festivalId)
      router.push('/home')
      router.refresh()
    } catch {
      setError('Could not save your festival. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className='px-4 py-6'>
      <header>
        <h1 className='font-heading text-4xl tracking-wide text-stagr-amber'>Confirm lineup</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          {draft.festival.name} · {slotCount} {slotCount === 1 ? 'act' : 'acts'} across {stages.length}{' '}
          {stages.length === 1 ? 'stage' : 'stages'}
        </p>
        {lowConfidenceCount > 0 ? (
          <p className='mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300'>
            <AlertCircle className='h-3.5 w-3.5' />
            {lowConfidenceCount} {lowConfidenceCount === 1 ? 'slot needs' : 'slots need'} a quick check
          </p>
        ) : null}
      </header>

      <div className='mt-4 flex gap-2 overflow-x-auto pb-1'>
        {stages.map((current, index) => (
          <button
            key={`${current.name}-${index}`}
            type='button'
            onClick={() => setActiveStage(index)}
            className={cn(
              'min-h-10 shrink-0 rounded-lg px-3 text-sm transition-colors',
              index === activeStage
                ? 'bg-stagr-amber font-semibold text-stagr-night'
                : 'border border-border bg-card text-foreground',
            )}
          >
            {current.name}
          </button>
        ))}
      </div>

      <section className='mt-3 space-y-2'>
        {stage.slots.map((slot, slotIndex) => {
          const isEditing = editing?.stageIndex === activeStage && editing.slotIndex === slotIndex
          return (
            <article
              key={`${slot.band_name}-${slotIndex}`}
              className={cn(
                'rounded-xl border bg-card p-3',
                slot.confidence === 'low' ? 'border-l-4 border-l-amber-400 border-border' : 'border-border',
              )}
            >
              {isEditing && editing ? (
                <div className='space-y-2'>
                  <input
                    value={editing.band_name}
                    onChange={(event) => setEditing({ ...editing, band_name: event.target.value })}
                    className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm'
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      type='time'
                      value={editing.start_time}
                      onChange={(event) => setEditing({ ...editing, start_time: event.target.value })}
                      className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm'
                    />
                    <input
                      type='time'
                      value={editing.end_time}
                      onChange={(event) => setEditing({ ...editing, end_time: event.target.value })}
                      className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm'
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={saveEdit}
                      className='inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-stagr-amber px-3 text-sm font-semibold text-stagr-night'
                    >
                      <Check className='h-4 w-4' /> Save
                    </button>
                    <button
                      type='button'
                      onClick={() => setEditing(null)}
                      className='min-h-10 rounded-lg border border-border px-3 text-sm'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => deleteSlot(activeStage, slotIndex)}
                      className='ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-sm text-destructive'
                    >
                      <Trash2 className='h-4 w-4' /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-xs tabular-nums text-muted-foreground'>
                      {slot.start_time}–{slot.end_time} ·{' '}
                      {formatDuration(durationMinutesFromTimes(slot.start_time, slot.end_time))}
                    </p>
                    <p className='mt-0.5 truncate text-base font-semibold text-foreground'>{slot.band_name}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() =>
                      setEditing({
                        stageIndex: activeStage,
                        slotIndex,
                        band_name: slot.band_name,
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                      })
                    }
                    className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-stagr-amber'
                    aria-label='Edit act'
                  >
                    <Pencil className='h-4 w-4' />
                  </button>
                </div>
              )}
            </article>
          )
        })}

        <button
          type='button'
          onClick={() => addSlot(activeStage)}
          className='flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stagr-amber/60 bg-stagr-amber/5 text-sm font-semibold text-stagr-amber'
        >
          <Plus className='h-4 w-4' /> Add a missing act
        </button>
      </section>

      {error ? (
        <div className='mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type='button'
        onClick={save}
        disabled={isSaving || slotCount === 0}
        className='mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stagr-amber px-4 font-semibold text-stagr-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {isSaving ? <Loader2 className='h-5 w-5 animate-spin' /> : null}
        {isSaving ? 'Saving…' : 'Looks good — save festival'}
      </button>
    </main>
  )
}
