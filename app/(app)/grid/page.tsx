import { CalendarPlus, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActiveFestival, getFestivalData } from '@/lib/festivals'
import { FestivalGrid } from '@/components/grid/festival-grid'
import { EmptyState } from '@/components/shared/empty-state'

export const dynamic = 'force-dynamic'

export default async function GridPage() {
  const supabase = await createClient()
  const festival = await getActiveFestival(supabase)

  if (!festival) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title='No festival yet'
        description='Create your first festival and import a lineup to see the full grid.'
        actionHref='/festival/new'
        actionLabel='Add a festival'
      />
    )
  }

  const data = await getFestivalData(supabase, festival.id)

  if (!data || data.slots.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title='No lineup imported'
        description={`${festival.name} doesn't have any set times yet. Import a lineup to build your grid.`}
        actionHref='/festival/new'
        actionLabel='Import a lineup'
      />
    )
  }

  return <FestivalGrid data={data} />
}
