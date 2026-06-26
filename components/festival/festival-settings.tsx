'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Loader2, ListMusic, MapPin, Music, Trash2 } from 'lucide-react'
import type { Festival } from '@/types'
import { formatDayLabel } from '@/lib/time'
import { setActiveFestival } from '@/app/actions'

interface FestivalSettingsProps {
  festival: Festival
  stageCount: number
  slotCount: number
  flaggedCount: number
}

export function FestivalSettings({ festival, stageCount, slotCount, flaggedCount }: FestivalSettingsProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: festival.name,
    location: festival.location ?? '',
    start_date: festival.start_date,
    end_date: festival.end_date,
  })
  const [isArchived, setIsArchived] = useState(festival.is_archived)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [busy, setBusy] = useState<null | 'archive' | 'delete'>(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/festivals/${festival.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error('update_failed')
    }
  }

  const saveDetails = async () => {
    setStatus('saving')
    setError('')
    try {
      await patch(form)
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setError('Could not save changes.')
      setStatus('idle')
    }
  }

  const toggleArchive = async () => {
    setBusy('archive')
    setError('')
    try {
      const next = !isArchived
      await patch({ is_archived: next })
      setIsArchived(next)
      router.refresh()
    } catch {
      setError('Could not update archive state.')
    } finally {
      setBusy(null)
    }
  }

  const deleteFestival = async () => {
    setBusy('delete')
    setError('')
    try {
      const response = await fetch(`/api/festivals/${festival.id}?hard=true`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('delete_failed')
      }
      router.push('/home')
      router.refresh()
    } catch {
      setError('Could not delete this festival.')
      setBusy(null)
    }
  }

  const makeActive = async () => {
    await setActiveFestival(festival.id)
    router.push('/home')
    router.refresh()
  }

  return (
    <main className='px-4 py-6'>
      <h1 className='font-heading text-4xl tracking-wide text-stagr-amber'>Festival settings</h1>

      <div className='mt-4 grid grid-cols-3 gap-2'>
        <Stat icon={Music} value={stageCount} label='Stages' />
        <Stat icon={ListMusic} value={slotCount} label='Acts' />
        <Stat icon={MapPin} value={flaggedCount} label='Flagged' />
      </div>

      <button
        type='button'
        onClick={makeActive}
        className='mt-4 min-h-11 w-full rounded-xl border border-stagr-amber/50 bg-stagr-amber/10 px-4 text-sm font-semibold text-stagr-amber'
      >
        View this festival
      </button>

      <section className='mt-5 space-y-3 rounded-2xl border border-border bg-card p-4'>
        <Field label='Name'>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none'
          />
        </Field>
        <Field label='Location'>
          <input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none'
          />
        </Field>
        <div className='grid grid-cols-2 gap-3'>
          <Field label='Start date'>
            <input
              type='date'
              value={form.start_date}
              onChange={(event) => setForm({ ...form, start_date: event.target.value })}
              className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none'
            />
          </Field>
          <Field label='End date'>
            <input
              type='date'
              value={form.end_date}
              min={form.start_date}
              onChange={(event) => setForm({ ...form, end_date: event.target.value })}
              className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none'
            />
          </Field>
        </div>
        <p className='text-xs text-muted-foreground'>
          {formatDayLabel(festival.start_date)} – {formatDayLabel(festival.end_date)}
        </p>
        <button
          type='button'
          onClick={saveDetails}
          disabled={status === 'saving'}
          className='flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-stagr-amber px-4 font-semibold text-stagr-night disabled:opacity-60'
        >
          {status === 'saving' ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          {status === 'saved' ? 'Saved ✓' : 'Save changes'}
        </button>
      </section>

      <section className='mt-4 space-y-3 rounded-2xl border border-border bg-card p-4'>
        <button
          type='button'
          onClick={toggleArchive}
          disabled={busy === 'archive'}
          className='flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground disabled:opacity-60'
        >
          {busy === 'archive' ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : isArchived ? (
            <ArchiveRestore className='h-4 w-4' />
          ) : (
            <Archive className='h-4 w-4' />
          )}
          {isArchived ? 'Unarchive festival' : 'Archive festival'}
        </button>

        {confirmDelete ? (
          <div className='space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3'>
            <p className='text-sm text-foreground'>
              Permanently delete <span className='font-semibold'>{festival.name}</span> and all its set times?
              This can&apos;t be undone.
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={deleteFestival}
                disabled={busy === 'delete'}
                className='flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white disabled:opacity-60'
              >
                {busy === 'delete' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Trash2 className='h-4 w-4' />}
                Delete
              </button>
              <button
                type='button'
                onClick={() => setConfirmDelete(false)}
                className='min-h-10 flex-1 rounded-lg border border-border px-3 text-sm'
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setConfirmDelete(true)}
            className='flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 text-sm font-medium text-destructive'
          >
            <Trash2 className='h-4 w-4' /> Delete festival
          </button>
        )}
      </section>

      {error ? <p className='mt-3 text-sm text-destructive'>{error}</p> : null}
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className='block space-y-1.5'>
      <span className='text-sm font-medium text-foreground/90'>{label}</span>
      {children}
    </label>
  )
}

function Stat({ icon: Icon, value, label }: { icon: typeof Music; value: number; label: string }) {
  return (
    <div className='flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-3'>
      <Icon className='h-5 w-5 text-stagr-amber' />
      <span className='text-lg font-bold text-foreground'>{value}</span>
      <span className='text-[11px] text-muted-foreground'>{label}</span>
    </div>
  )
}
