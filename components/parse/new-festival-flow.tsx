'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ClipboardList, ImageIcon, Loader2, Lock, Sparkles } from 'lucide-react'
import type { ParsedLineup } from '@/types'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NEW_FESTIVAL_DRAFT_KEY } from '@/lib/drafts'

type ParseMethod = 'text' | 'image'

interface NewFestivalFlowProps {
  userId: string
  isPremium: boolean
  atFreeLimit: boolean
}

interface FormState {
  name: string
  location: string
  startDate: string
  endDate: string
}

export function NewFestivalFlow({ userId, isPremium, atFreeLimit }: NewFestivalFlowProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<ParseMethod>('text')
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>({ name: '', location: '', startDate: '', endDate: '' })

  const canAdvance = form.name.trim() && form.startDate && form.endDate
  const canSubmit = method === 'text' ? textInput.trim().length > 0 : imageFile !== null

  const handleField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Keep end date sensible relative to start date.
      if (field === 'startDate' && (!prev.endDate || prev.endDate < value)) {
        next.endDate = value
      }
      return next
    })
  }

  const uploadImage = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop() || 'jpg'
    // Path must start with the user id to satisfy the storage RLS policy.
    const path = `${userId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('lineup-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      throw uploadError
    }

    const { data, error: signedError } = await supabase.storage
      .from('lineup-images')
      .createSignedUrl(path, 600)
    if (signedError || !data?.signedUrl) {
      throw signedError ?? new Error('Could not create signed URL')
    }
    return data.signedUrl
  }

  const handleParse = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      let response: Response
      if (method === 'text') {
        response = await fetch('/api/parse/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput, festival_name: form.name }),
        })
      } else {
        if (!imageFile) {
          throw new Error('No image selected')
        }
        const imageUrl = await uploadImage(imageFile)
        response = await fetch('/api/parse/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl, festival_name: form.name }),
        })
      }

      const data = (await response.json()) as ParsedLineup | { error: string; message?: string }

      if (!response.ok || 'error' in data) {
        const code = 'error' in data ? data.error : 'parse_failed'
        if (code === 'no_content') {
          setError('We couldn’t find any acts in that. Try adding stage names and set times.')
        } else if (code === 'premium_required') {
          setError('Image parsing is a premium feature. Use text paste, or upgrade to premium.')
        } else {
          setError('We couldn’t read that lineup. Try the other import method or tidy up the input.')
        }
        return
      }

      const draft = {
        festival: {
          name: form.name,
          location: form.location,
          start_date: form.startDate,
          end_date: form.endDate,
        },
        parsed_lineup: data,
      }
      sessionStorage.setItem(NEW_FESTIVAL_DRAFT_KEY, JSON.stringify(draft))
      router.push('/festival/new/confirm')
    } catch {
      setError('Something went wrong while reading the lineup. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className='px-4 py-6'>
      <div className='flex items-center gap-2'>
        <h1 className='font-heading text-4xl tracking-wide text-stagr-amber'>New festival</h1>
      </div>
      <div className='mt-3 flex items-center gap-2'>
        <StepDot active={step >= 1} done={step > 1} label='Details' />
        <div className='h-px w-6 bg-border' />
        <StepDot active={step >= 2} done={false} label='Import lineup' />
      </div>

      {atFreeLimit ? (
        <div className='mt-4 flex items-start gap-2 rounded-xl border border-stagr-amber/40 bg-stagr-amber/10 px-3 py-2.5 text-sm'>
          <Sparkles className='mt-0.5 h-4 w-4 shrink-0 text-stagr-amber' />
          <span className='text-foreground/90'>
            You&apos;re on the free plan (1 festival). Archive your current one first, or upgrade to add more.
          </span>
        </div>
      ) : null}

      {step === 1 ? (
        <section className='mt-5 space-y-4 rounded-2xl border border-border bg-card p-4'>
          <Field label='Festival name'>
            <input
              type='text'
              value={form.name}
              onChange={(event) => handleField('name', event.target.value)}
              placeholder='e.g. Glastonbury 2026'
              className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
            />
          </Field>
          <Field label='Location (optional)'>
            <input
              type='text'
              value={form.location}
              onChange={(event) => handleField('location', event.target.value)}
              placeholder='Worthy Farm, Somerset'
              className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
            />
          </Field>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='Start date'>
              <input
                type='date'
                value={form.startDate}
                onChange={(event) => handleField('startDate', event.target.value)}
                className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
              />
            </Field>
            <Field label='End date'>
              <input
                type='date'
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(event) => handleField('endDate', event.target.value)}
                className='min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
              />
            </Field>
          </div>
          <button
            type='button'
            onClick={() => setStep(2)}
            disabled={!canAdvance}
            className='min-h-12 w-full rounded-xl bg-stagr-amber px-4 font-semibold text-stagr-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Continue
          </button>
        </section>
      ) : (
        <section className='mt-5 space-y-4 rounded-2xl border border-border bg-card p-4'>
          <div className='grid grid-cols-2 gap-3'>
            <MethodCard
              active={method === 'text'}
              icon={ClipboardList}
              title='Paste text'
              subtitle='Set times, list, schedule'
              onClick={() => setMethod('text')}
            />
            <MethodCard
              active={method === 'image'}
              icon={ImageIcon}
              title='Screenshot'
              subtitle={isPremium ? 'Photo or poster' : 'Premium'}
              locked={!isPremium}
              onClick={() => {
                if (isPremium) {
                  setMethod('image')
                } else {
                  setError('Image parsing is a premium feature. Paste text instead, or upgrade.')
                }
              }}
            />
          </div>

          {method === 'text' ? (
            <textarea
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder={
                'Paste anything — set times, a lineup list, even a rough schedule.\n\nMain Stage\n20:00 Headliner\n18:00 Support act\n\nWe’ll figure out the rest.'
              }
              className='min-h-56 w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
            />
          ) : (
            <div className='rounded-xl border border-dashed border-border bg-background p-4 text-center'>
              <input
                id='lineup-image'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className='hidden'
              />
              <label
                htmlFor='lineup-image'
                className='flex cursor-pointer flex-col items-center gap-2 py-4 text-sm text-muted-foreground'
              >
                <ImageIcon className='h-8 w-8 text-stagr-amber' />
                {imageFile ? (
                  <span className='font-medium text-foreground'>{imageFile.name}</span>
                ) : (
                  <span>Tap to choose a screenshot or photo</span>
                )}
              </label>
            </div>
          )}

          {error ? (
            <div className='flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
              <span>{error}</span>
            </div>
          ) : null}

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={() => setStep(1)}
              className='min-h-12 rounded-xl border border-border px-5 font-medium text-foreground'
            >
              Back
            </button>
            <button
              type='button'
              disabled={!canSubmit || isSubmitting}
              onClick={handleParse}
              className='flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-stagr-amber px-4 font-semibold text-stagr-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSubmitting ? <Loader2 className='h-5 w-5 animate-spin' /> : <Sparkles className='h-5 w-5' />}
              {isSubmitting ? 'Reading lineup…' : 'Parse with AI'}
            </button>
          </div>
        </section>
      )}
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

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={cn('text-xs font-medium', active ? 'text-stagr-amber' : 'text-muted-foreground')}>
      {done ? '✓ ' : ''}
      {label}
    </span>
  )
}

interface MethodCardProps {
  active: boolean
  locked?: boolean
  icon: typeof ClipboardList
  title: string
  subtitle: string
  onClick: () => void
}

function MethodCard({ active, locked, icon: Icon, title, subtitle, onClick }: MethodCardProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'relative flex min-h-24 flex-col items-start justify-center gap-1 rounded-xl border p-3 text-left transition-colors',
        active ? 'border-stagr-amber bg-stagr-amber/10' : 'border-border bg-background hover:border-stagr-amber/40',
      )}
    >
      {locked ? <Lock className='absolute right-3 top-3 h-4 w-4 text-muted-foreground' /> : null}
      <Icon className='h-6 w-6 text-stagr-amber' />
      <span className='text-base font-semibold text-foreground'>{title}</span>
      <span className='text-xs text-muted-foreground'>{subtitle}</span>
    </button>
  )
}
