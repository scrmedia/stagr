import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getProfile, listFestivals } from '@/lib/festivals'
import { NewFestivalFlow } from '@/components/parse/new-festival-flow'

export const dynamic = 'force-dynamic'

export default async function NewFestivalPage() {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  const [profile, festivals] = await Promise.all([
    user ? getProfile(supabase, user.id) : Promise.resolve(null),
    listFestivals(supabase),
  ])

  const isPremium = profile?.is_premium ?? false
  const activeCount = festivals.filter((festival) => !festival.is_archived).length

  return (
    <NewFestivalFlow
      userId={user?.id ?? ''}
      isPremium={isPremium}
      atFreeLimit={!isPremium && activeCount >= 1}
    />
  )
}
