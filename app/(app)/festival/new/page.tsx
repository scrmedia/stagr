'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ParsedLineup } from '@/types'
import { createClient } from '@/lib/supabase/client'

type ParseMethod = 'text' | 'image'

interface FestivalDraft {
  name: string
  location: string
  startDate: string
  endDate: string
  parseMethod: ParseMethod
  textInput: string
}

const DRAFT_KEY = 'stagr:new-festival-draft'

export default function NewFestivalPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState<FestivalDraft>({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    parseMethod: 'text',
    textInput: '',
  })

  const canAdvance = form.name.trim() && form.startDate && form.endDate
  const canSubmit = form.parseMethod === 'text' ? form.textInput.trim().length > 0 : imageFile !== null

  const handleField = (field: keyof FestivalDraft, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const uploadImageAndGetSignedUrl = async (file: File) => {
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `uploads/${crypto.randomUUID()}.${extension}`

    const uploadResult = await supabase.storage.from('lineup-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadResult.error) {
      throw uploadResult.error
    }

    const signedUrlResult = await supabase.storage.from('lineup-images').createSignedUrl(path, 600)

    if (signedUrlResult.error || !signedUrlResult.data.signedUrl) {
      throw signedUrlResult.error ?? new Error('Could not create signed URL')
    }

    return signedUrlResult.data.signedUrl
  }

  const handleParse = async () => {
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const endpoint = form.parseMethod === 'text' ? '/api/parse/text' : '/api/parse/image'
      let payload: { text: string; festival_name: string } | { image_url: string; festival_name: string }

      if (form.parseMethod === 'text') {
        payload = {
          text: form.textInput,
          festival_name: form.name,
        }
      } else {
        if (!imageFile) {
          throw new Error('No image selected')
        }

        payload = {
          image_url: await uploadImageAndGetSignedUrl(imageFile),
          festival_name: form.name,
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as ParsedLineup | { error: string }

      if (!response.ok || 'error' in data) {
        throw new Error('Unable to parse lineup right now')
      }

      const draftPayload = {
        festival: {
          name: form.name,
          location: form.location,
          start_date: form.startDate,
          end_date: form.endDate,
        },
        parsed_lineup: data,
      }

      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload))
      router.push('/festival/new/confirm')
    } catch {
      setErrorMessage('We could not read that lineup. Try the other import method or adjust your input.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className='mx-auto w-full max-w-3xl px-4 py-6 sm:px-6'>
      <h1 className='font-heading text-5xl tracking-wide text-[#FFD600]'>Create Festival</h1>
      <p className='mt-2 text-sm text-foreground/80'>Step {step} of 2</p>

      {step === 1 ? (
        <section className='mt-6 space-y-4 rounded-xl border border-[#2f2b13] bg-card p-4'>
          <label className='block space-y-2'>
            <span className='text-sm text-foreground/90'>Festival name</span>
            <input
              type='text'
              value={form.name}
              onChange={(event) => handleField('name', event.target.value)}
              className='min-h-11 w-full rounded-md border border-border bg-background px-3 text-base'
            />
          </label>

          <label className='block space-y-2'>
            <span className='text-sm text-foreground/90'>Location</span>
            <input
              type='text'
              value={form.location}
              onChange={(event) => handleField('location', event.target.value)}
              className='min-h-11 w-full rounded-md border border-border bg-background px-3 text-base'
            />
          </label>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <label className='block space-y-2'>
              <span className='text-sm text-foreground/90'>Start date</span>
              <input
                type='date'
                value={form.startDate}
                onChange={(event) => handleField('startDate', event.target.value)}
                className='min-h-11 w-full rounded-md border border-border bg-background px-3 text-base'
              />
            </label>

            <label className='block space-y-2'>
              <span className='text-sm text-foreground/90'>End date</span>
              <input
                type='date'
                value={form.endDate}
                onChange={(event) => handleField('endDate', event.target.value)}
                className='min-h-11 w-full rounded-md border border-border bg-background px-3 text-base'
              />
            </label>
          </div>

          <button
            type='button'
            onClick={() => setStep(2)}
            disabled={!canAdvance}
            className='min-h-11 w-full rounded-md bg-[#FFD600] px-4 font-semibold text-[#111008] disabled:cursor-not-allowed disabled:opacity-50'
          >
            Next
          </button>
        </section>
      ) : (
        <section className='mt-6 space-y-4 rounded-xl border border-[#2f2b13] bg-card p-4'>
          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={() => setForm((prev) => ({ ...prev, parseMethod: 'text' }))}
              className={`min-h-24 rounded-lg border p-3 text-left transition ${
                form.parseMethod === 'text'
                  ? 'border-[#FFD600] bg-[#FFD600]/10'
                  : 'border-border bg-background hover:border-[#FFD600]/50'
              }`}
            >
              <p className='font-heading text-2xl'>📋 Paste Set Times</p>
            </button>

            <button
              type='button'
              onClick={() => setForm((prev) => ({ ...prev, parseMethod: 'image' }))}
              className={`min-h-24 rounded-lg border p-3 text-left transition ${
                form.parseMethod === 'image'
                  ? 'border-[#FFD600] bg-[#FFD600]/10'
                  : 'border-border bg-background hover:border-[#FFD600]/50'
              }`}
            >
              <p className='font-heading text-2xl'>📷 Screenshot or Photo</p>
            </button>
          </div>

          {form.parseMethod === 'text' ? (
            <textarea
              value={form.textInput}
              onChange={(event) => handleField('textInput', event.target.value)}
              placeholder="Paste anything — set times, a lineup list, even a rough schedule. We'll figure it out."
              className='min-h-56 w-full rounded-lg border border-border bg-background p-3 text-sm'
            />
          ) : (
            <div className='rounded-lg border border-border bg-background p-3'>
              <input
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className='block min-h-11 w-full text-sm'
              />
              {imageFile ? <p className='mt-2 text-xs text-foreground/80'>{imageFile.name}</p> : null}
            </div>
          )}

          {errorMessage ? <p className='text-sm text-amber-300'>{errorMessage}</p> : null}

          <button
            type='button'
            disabled={!canSubmit || isSubmitting}
            onClick={handleParse}
            className='min-h-11 w-full rounded-md bg-[#FFD600] px-4 font-semibold text-[#111008] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isSubmitting ? 'Reading lineup…' : 'Read Lineup →'}
          </button>
        </section>
      )}
    </main>
  )
}
