import { CalendarPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActiveFestival, getFestivalData } from '@/lib/festivals'
import { LineupView } from '@/components/lineup/lineup-view'
import { EmptyState } from '@/components/shared/empty-state'

export const dynamic = 'force-dynamic'

export default async function LineupPage() {
  const supabase = await createClient()
  const festival = await getActiveFestival(supabase)

  if (!festival) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title='No festival yet'
        description='Create a festival and import its lineup to start building your personal schedule.'
        actionHref='/festival/new'
        actionLabel='Add a festival'
      />
    )
  }

  const data = await getFestivalData(supabase, festival.id)

  if (!data) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title='No lineup imported'
        description={`Import a lineup for ${festival.name} to begin.`}
        actionHref='/festival/new'
        actionLabel='Import a lineup'
      />
    )
  }

  return <LineupView data={data} />
}
