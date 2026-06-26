'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_FESTIVAL_COOKIE } from '@/lib/festivals'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** Pin a festival as the active one across the Home/Grid/Lineup views. */
export async function setActiveFestival(festivalId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_FESTIVAL_COOKIE, festivalId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}
