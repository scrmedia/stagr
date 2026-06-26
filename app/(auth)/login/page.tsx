import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,214,0,0.12),_transparent_60%)]' />
      <Link
        href='/'
        className='absolute left-6 top-6 font-heading text-2xl tracking-[0.18em] text-stagr-amber'
      >
        STAGR
      </Link>
      <div className='relative w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <h1 className='font-heading text-5xl tracking-wide text-foreground'>Welcome back</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            Sign in to plan your festival and never miss a set.
          </p>
        </div>
        <LoginForm initialError={error ?? null} />
      </div>
    </main>
  )
}
