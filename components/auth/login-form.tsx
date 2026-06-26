'use client'

import { FormEvent, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  initialError: string | null
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(initialError)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (signInError) {
        setError(signInError.message)
        setStatus('idle')
        return
      }

      setStatus('sent')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })

      if (oauthError) {
        setError('Google sign-in is not available right now. Use a magic link instead.')
        setGoogleLoading(false)
      }
    } catch {
      setError('Google sign-in is not available right now. Use a magic link instead.')
      setGoogleLoading(false)
    }
  }

  if (status === 'sent') {
    return (
      <div className='rounded-2xl border border-border bg-card p-6 text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stagr-amber/15'>
          <Mail className='h-6 w-6 text-stagr-amber' />
        </div>
        <h2 className='mt-4 text-lg font-semibold text-foreground'>Check your email</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          We sent a magic link to <span className='text-foreground'>{email}</span>. Tap it to sign in.
        </p>
        <button
          type='button'
          onClick={() => setStatus('idle')}
          className='mt-4 text-sm font-medium text-stagr-amber hover:underline'
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className='space-y-4 rounded-2xl border border-border bg-card p-6'>
      <button
        type='button'
        onClick={handleGoogle}
        disabled={googleLoading}
        className='flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-base font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60'
      >
        {googleLoading ? (
          <Loader2 className='h-5 w-5 animate-spin' />
        ) : (
          <GoogleIcon className='h-5 w-5' />
        )}
        Continue with Google
      </button>

      <div className='flex items-center gap-3'>
        <span className='h-px flex-1 bg-border' />
        <span className='text-xs uppercase tracking-wide text-muted-foreground'>or</span>
        <span className='h-px flex-1 bg-border' />
      </div>

      <form onSubmit={handleMagicLink} className='space-y-3'>
        <label htmlFor='email' className='block text-sm font-medium text-foreground'>
          Email address
        </label>
        <input
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='you@example.com'
          className='min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-stagr-amber focus:outline-none focus:ring-2 focus:ring-stagr-amber/40'
        />
        <button
          type='submit'
          disabled={status === 'sending'}
          className='flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stagr-amber px-4 text-base font-semibold text-stagr-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {status === 'sending' ? <Loader2 className='h-5 w-5 animate-spin' /> : null}
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {error ? (
        <p className='rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive' role='alert'>
          {error}
        </p>
      ) : null}

      <p className='text-center text-xs text-muted-foreground'>
        No password needed. We email you a secure sign-in link.
      </p>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z'
      />
      <path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z'
      />
      <path
        fill='#FBBC05'
        d='M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z'
      />
      <path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z'
      />
    </svg>
  )
}
