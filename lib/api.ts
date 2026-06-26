import { createClient } from '@/lib/supabase/server'

/**
 * Resolves the authenticated user for a route handler. Returns the server
 * Supabase client (cookie-scoped, so RLS applies) alongside the user, which is
 * null when there is no valid session.
 */
export async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function isPremiumUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_premium').eq('id', userId).maybeSingle()
  return Boolean((data as { is_premium?: boolean } | null)?.is_premium)
}
