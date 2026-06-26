import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Festival } from '@/types'
import { FestivalSettings } from '@/components/festival/festival-settings'

export const dynamic = 'force-dynamic'

export default async function FestivalSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: festival } = await supabase.from('festivals').select('*').eq('id', id).maybeSingle()
  if (!festival) {
    notFound()
  }

  const [{ count: stageCount }, { count: slotCount }, { count: flaggedCount }] = await Promise.all([
    supabase.from('stages').select('id', { count: 'exact', head: true }).eq('festival_id', id),
    supabase.from('slots').select('id', { count: 'exact', head: true }).eq('festival_id', id),
    supabase.from('user_slots').select('id', { count: 'exact', head: true }).eq('festival_id', id),
  ])

  return (
    <FestivalSettings
      festival={festival as Festival}
      stageCount={stageCount ?? 0}
      slotCount={slotCount ?? 0}
      flaggedCount={flaggedCount ?? 0}
    />
  )
}
