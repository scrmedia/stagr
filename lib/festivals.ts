import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { daysBetween, spanStart } from '@/lib/time'
import type { Festival, FestivalData, Profile, SlotWithStage, Stage } from '@/types'

export const ACTIVE_FESTIVAL_COOKIE = 'stagr_festival'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Returns the signed-in auth user, or null. Uses getUser() (validates the JWT). */
export async function getCurrentUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getProfile(supabase: SupabaseServerClient, userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return (data as Profile | null) ?? null
  } catch {
    return null
  }
}

/** All of the current user's festivals, newest first (RLS scopes to the user). */
export async function listFestivals(supabase: SupabaseServerClient): Promise<Festival[]> {
  try {
    const { data } = await supabase
      .from('festivals')
      .select('*')
      .order('created_at', { ascending: false })
    return (data as Festival[] | null) ?? []
  } catch {
    return []
  }
}

/**
 * The festival the app views should show: the one pinned in the active-festival
 * cookie if it still exists, otherwise the most recent non-archived festival.
 */
export async function getActiveFestival(supabase: SupabaseServerClient): Promise<Festival | null> {
  const festivals = await listFestivals(supabase)
  if (festivals.length === 0) {
    return null
  }

  const cookieStore = await cookies()
  const pinnedId = cookieStore.get(ACTIVE_FESTIVAL_COOKIE)?.value
  const pinned = pinnedId ? festivals.find((festival) => festival.id === pinnedId) : undefined
  if (pinned) {
    return pinned
  }

  const active = festivals.find((festival) => !festival.is_archived)
  return active ?? festivals[0]
}

/** Full bundle for one festival: stages, slots (with stage + flag), and day list. */
export async function getFestivalData(
  supabase: SupabaseServerClient,
  festivalId: string,
): Promise<FestivalData | null> {
  try {
    const [{ data: festival }, { data: stages }, { data: slots }, { data: userSlots }] =
      await Promise.all([
        supabase.from('festivals').select('*').eq('id', festivalId).maybeSingle(),
        supabase
          .from('stages')
          .select('*')
          .eq('festival_id', festivalId)
          .order('display_order', { ascending: true }),
        supabase.from('slots').select('*, stage:stages(*)').eq('festival_id', festivalId),
        supabase.from('user_slots').select('slot_id').eq('festival_id', festivalId),
      ])

    if (!festival) {
      return null
    }

    const typedFestival = festival as Festival
    const typedStages = (stages as Stage[] | null) ?? []
    const flaggedIds = new Set(((userSlots as { slot_id: string }[] | null) ?? []).map((row) => row.slot_id))

    const rawSlots = (slots as (SlotWithStage & { stage: Stage | null })[] | null) ?? []
    const typedSlots: SlotWithStage[] = rawSlots
      .filter((slot) => slot.stage !== null)
      .map((slot) => ({ ...slot, is_flagged: flaggedIds.has(slot.id) }))
      .sort((a, b) => spanStart(a).getTime() - spanStart(b).getTime())

    // Prefer the day values present in slots; fall back to the festival's date range.
    const slotDays = Array.from(new Set(typedSlots.map((slot) => slot.day))).sort()
    const days =
      slotDays.length > 0 ? slotDays : daysBetween(typedFestival.start_date, typedFestival.end_date)

    return { festival: typedFestival, stages: typedStages, slots: typedSlots, days }
  } catch {
    return null
  }
}
