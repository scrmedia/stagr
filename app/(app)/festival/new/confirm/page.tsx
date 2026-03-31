'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import type { ParsedLineup } from '@/types'
import { createClient } from '@/lib/supabase/client'

const DRAFT_KEY = 'stagr:new-festival-draft'

type ParsedStage = ParsedLineup['stages'][number]
type ParsedSlot = ParsedStage['slots'][number]

interface FestivalDraftStorage {
  festival: {
    name: string
    location: string
    start_date: string
    end_date: string
  }
  parsed_lineup: ParsedLineup
}

interface EditableState {
  stageIndex: number
  slotIndex: number
  band_name: string
  start_time: string
  end_time: string
}

function minutesBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  return endHour * 60 + endMinute - (startHour * 60 + startMinute)
}

export default function ConfirmParsedLineupPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [activeStageIndex, setActiveStageIndex] = useState(0)
  const [draft, setDraft] = useState<FestivalDraftStorage | null>(null)
  const [editable, setEditable] = useState<EditableState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem(DRAFT_KEY)

    if (!stored) {
      return
    }

    try {
      const parsed = JSON.parse(stored) as FestivalDraftStorage
      setDraft(parsed)
    } catch {
      setErrorMessage('Could not load parsed lineup draft.')
    }
  }, [])

  const slotCount =
    draft?.parsed_lineup.stages.reduce((total, stage) => total + stage.slots.length, 0) ?? 0

  const beginEdit = (stageIndex: number, slotIndex: number, slot: ParsedSlot) => {
    setEditable({
      stageIndex,
      slotIndex,
      band_name: slot.band_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
    })
  }

  const saveInlineEdit = () => {
    if (!draft || !editable) {
      return
    }

    setDraft((prev) => {
      if (!prev) {
        return prev
      }

      const stages = prev.parsed_lineup.stages.map((stage, stageIdx) => {
        if (stageIdx !== editable.stageIndex) {
          return stage
        }

        const slots = stage.slots.map((slot, slotIdx) => {
          if (slotIdx !== editable.slotIndex) {
            return slot
          }

          return {
            ...slot,
            band_name: editable.band_name,
            start_time: editable.start_time,
            end_time: editable.end_time,
          }
        })

        return { ...stage, slots }
      })

      return {
        ...prev,
        parsed_lineup: {
          ...prev.parsed_lineup,
          stages,
        },
      }
    })

    setEditable(null)
  }

  const deleteSlot = (stageIndex: number, slotIndex: number) => {
    setDraft((prev) => {
      if (!prev) {
        return prev
      }

      const stages = prev.parsed_lineup.stages.map((stage, idx) => {
        if (idx !== stageIndex) {
          return stage
        }

        return {
          ...stage,
          slots: stage.slots.filter((_, currentIndex) => currentIndex !== slotIndex),
        }
      })

      return {
        ...prev,
        parsed_lineup: {
          ...prev.parsed_lineup,
          stages,
        },
      }
    })

    setEditable(null)
  }

  const addMissingSlot = (stageIndex: number) => {
    setDraft((prev) => {
      if (!prev) {
        return prev
      }

      const stages = prev.parsed_lineup.stages.map((stage, idx) => {
        if (idx !== stageIndex) {
          return stage
        }

        return {
          ...stage,
          slots: [
            ...stage.slots,
            {
              band_name: 'New Artist',
              day: prev.festival.start_date,
              start_time: '12:00',
              end_time: '12:45',
              confidence: 'low' as const,
            },
          ],
        }
      })

      return {
        ...prev,
        parsed_lineup: {
          ...prev.parsed_lineup,
          stages,
        },
      }
    })
  }

  const saveFestival = async () => {
    if (!draft) {
      return
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('No active user')
      }

      const festivalResult = await supabase
        .from('festivals')
        .insert({
          user_id: user.id,
          name: draft.festival.name,
          location: draft.festival.location || null,
          start_date: draft.festival.start_date,
          end_date: draft.festival.end_date,
        })
        .select('id')
        .single()

      if (festivalResult.error || !festivalResult.data) {
        throw festivalResult.error ?? new Error('Could not create festival')
      }

      const festivalId = festivalResult.data.id
      const stagePayload = draft.parsed_lineup.stages.map((stage, index) => ({
        festival_id: festivalId,
        name: stage.name,
        display_order: index,
      }))

      const stagesResult = await supabase.from('stages').insert(stagePayload).select('id, name')

      if (stagesResult.error || !stagesResult.data) {
        throw stagesResult.error ?? new Error('Could not create stages')
      }

      const slotsPayload = stagesResult.data.flatMap((savedStage) => {
        const parsedStage = draft.parsed_lineup.stages.find((stage) => stage.name === savedStage.name)

        if (!parsedStage) {
          return []
        }

        return parsedStage.slots.map((slot) => ({
          festival_id: festivalId,
          stage_id: savedStage.id,
          band_name: slot.band_name,
          day: slot.day ?? draft.festival.start_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))
      })

      if (slotsPayload.length > 0) {
        const slotsResult = await supabase.from('slots').insert(slotsPayload)

        if (slotsResult.error) {
          throw slotsResult.error
        }
      }

      sessionStorage.removeItem(DRAFT_KEY)
      router.push('/home')
    } catch {
      setErrorMessage('Could not save festival right now. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!draft) {
    return (
      <main className='mx-auto w-full max-w-3xl px-4 py-6 sm:px-6'>
        <h1 className='font-heading text-5xl tracking-wide text-[#FFD600]'>Confirm Lineup</h1>
        <p className='mt-4 text-sm text-foreground/80'>No parsed lineup found. Go back and parse a lineup first.</p>
      </main>
    )
  }

  const stage = draft.parsed_lineup.stages[activeStageIndex]

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6'>
      <header className='rounded-xl border border-[#2f2b13] bg-card p-4'>
        <h1 className='font-heading text-5xl tracking-wide text-[#FFD600]'>Confirm Lineup</h1>
        <p className='mt-2 text-sm text-foreground/90'>
          {draft.festival.name} • {slotCount} slots found
        </p>
      </header>

      <div className='mt-4 flex gap-2 overflow-x-auto pb-1'>
        {draft.parsed_lineup.stages.map((currentStage, index) => (
          <button
            key={currentStage.name}
            type='button'
            onClick={() => setActiveStageIndex(index)}
            className={`min-h-11 shrink-0 rounded-md px-4 py-2 text-sm ${
              index === activeStageIndex
                ? 'bg-[#FFD600] font-semibold text-[#111008]'
                : 'border border-border bg-card text-foreground'
            }`}
          >
            {currentStage.name}
          </button>
        ))}
      </div>

      <section className='mt-4 max-h-[58vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-3'>
        {stage.slots.map((slot, slotIndex) => {
          const isEditing =
            editable?.stageIndex === activeStageIndex && editable.slotIndex === slotIndex
          const durationMinutes = minutesBetween(slot.start_time, slot.end_time)

          return (
            <article
              key={`${slot.band_name}-${slot.start_time}-${slotIndex}`}
              className={`rounded-lg border bg-background p-3 ${
                slot.confidence === 'low' ? 'border-amber-400 border-l-4' : 'border-border'
              }`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <p className='text-xs text-foreground/70'>
                    {slot.start_time} - {slot.end_time} • {durationMinutes} min
                  </p>
                  <p className='mt-1 text-base font-semibold'>{slot.band_name}</p>
                  {slot.confidence === 'low' ? (
                    <span className='mt-2 inline-flex rounded bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300'>
                      Check
                    </span>
                  ) : null}
                </div>

                <button
                  type='button'
                  onClick={() => beginEdit(activeStageIndex, slotIndex, slot)}
                  className='min-h-11 min-w-11 rounded-md border border-border p-2 text-foreground/80 hover:text-[#FFD600]'
                  aria-label='Edit slot'
                >
                  <Pencil className='h-4 w-4' />
                </button>
              </div>

              {isEditing && editable ? (
                <div className='mt-3 space-y-2 border-t border-border pt-3'>
                  <input
                    value={editable.band_name}
                    onChange={(event) =>
                      setEditable((prev) =>
                        prev
                          ? {
                              ...prev,
                              band_name: event.target.value,
                            }
                          : prev,
                      )
                    }
                    className='min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm'
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      type='time'
                      value={editable.start_time}
                      onChange={(event) =>
                        setEditable((prev) =>
                          prev
                            ? {
                                ...prev,
                                start_time: event.target.value,
                              }
                            : prev,
                        )
                      }
                      className='min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm'
                    />
                    <input
                      type='time'
                      value={editable.end_time}
                      onChange={(event) =>
                        setEditable((prev) =>
                          prev
                            ? {
                                ...prev,
                                end_time: event.target.value,
                              }
                            : prev,
                        )
                      }
                      className='min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm'
                    />
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={saveInlineEdit}
                      className='min-h-11 rounded-md bg-[#FFD600] px-3 text-sm font-semibold text-[#111008]'
                    >
                      Save
                    </button>
                    <button
                      type='button'
                      onClick={() => setEditable(null)}
                      className='min-h-11 rounded-md border border-border px-3 text-sm'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => deleteSlot(activeStageIndex, slotIndex)}
                      className='ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-red-400/40 px-3 text-sm text-red-300'
                    >
                      <Trash2 className='h-4 w-4' />
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}

        <button
          type='button'
          onClick={() => addMissingSlot(activeStageIndex)}
          className='min-h-11 w-full rounded-md border border-dashed border-[#FFD600]/70 bg-[#FFD600]/10 px-3 text-sm font-semibold text-[#FFD600]'
        >
          Add missing slot
        </button>
      </section>

      {errorMessage ? <p className='mt-3 text-sm text-amber-300'>{errorMessage}</p> : null}

      <button
        type='button'
        onClick={saveFestival}
        disabled={isSaving}
        className='mt-4 min-h-11 w-full rounded-md bg-[#FFD600] px-4 font-semibold text-[#111008] disabled:cursor-not-allowed disabled:opacity-50'
      >
        {isSaving ? 'Saving…' : 'Looks Good →'}
      </button>
    </main>
  )
}
