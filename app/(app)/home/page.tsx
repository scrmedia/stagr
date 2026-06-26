import { CalendarPlus, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActiveFestival, getFestivalData } from '@/lib/festivals'
import { LiveView } from '@/components/live/live-view'
import { EmptyState } from '@/components/shared/empty-state'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const festival = await getActiveFestival(supabase)

  if (!festival) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title='Welcome to Stagr'
        description='Create your first festival and import the lineup with AI to get started.'
        actionHref='/festival/new'
        actionLabel='Add your festival'
      />
    )
  }

  const data = await getFestivalData(supabase, festival.id)

  if (!data || data.slots.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title='Import a lineup'
        description={`Add set times for ${festival.name} and your live day companion comes alive.`}
        actionHref='/festival/new'
        actionLabel='Import a lineup'
      />
    )
  }

  return <LiveView data={data} />
}
