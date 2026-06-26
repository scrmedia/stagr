import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveFestival, getProfile, listFestivals } from '@/lib/festivals'
import { AppHeader } from '@/components/app/app-header'
import { BottomNav } from '@/components/app/bottom-nav'

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [festivals, activeFestival, profile] = await Promise.all([
    listFestivals(supabase),
    getActiveFestival(supabase),
    getProfile(supabase, user.id),
  ])

  return (
    <div className='flex min-h-screen flex-col'>
      <AppHeader
        festivals={festivals}
        activeFestivalId={activeFestival?.id ?? null}
        userEmail={user.email ?? 'You'}
        isPremium={profile?.is_premium ?? false}
      />
      <div className='mx-auto w-full max-w-2xl flex-1 pb-24'>{children}</div>
      <BottomNav />
    </div>
  )
}
