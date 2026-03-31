'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setMessage('Check your email for the magic link.')
    setIsSubmitting(false)
  }

  return (
    <main className='flex min-h-screen items-center justify-center px-6'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6'
      >
        <h1 className='font-heading text-4xl tracking-wide text-stagr-amber'>Sign in</h1>
        <label htmlFor='email' className='block text-sm font-medium text-foreground'>
          Email
        </label>
        <input
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className='min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
          placeholder='you@example.com'
        />
        <button
          type='submit'
          disabled={isSubmitting}
          className='min-h-11 w-full rounded-md bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isSubmitting ? 'Sending magic link...' : 'Send magic link'}
        </button>
        {message ? <p className='text-sm text-muted-foreground'>{message}</p> : null}
      </form>
    </main>
  )
}
