import { NextResponse } from 'next/server'
import { getAuthedClient, isPremiumUser } from '@/lib/api'
import type { ParsedLineup } from '@/types'

interface CreateFestivalBody {
  festival: {
    name: string
    location?: string | null
    start_date: string
    end_date: string
  }
  lineup: ParsedLineup
}

const FREE_TIER_FESTIVAL_LIMIT = 1

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: CreateFestivalBody
  try {
    body = (await request.json()) as CreateFestivalBody
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const festival = body.festival
  if (!festival?.name?.trim() || !festival.start_date || !festival.end_date) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Freemium gate: free users may keep a single active festival. Enforced
  // server-side so a tampered client can't exceed the limit.
  const isPremium = await isPremiumUser(supabase, user.id)
  if (!isPremium) {
    const { count } = await supabase
      .from('festivals')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false)

    if ((count ?? 0) >= FREE_TIER_FESTIVAL_LIMIT) {
      return NextResponse.json({ error: 'limit_reached' }, { status: 403 })
    }
  }

  try {
    const { data: createdFestival, error: festivalError } = await supabase
      .from('festivals')
      .insert({
        user_id: user.id,
        name: festival.name.trim(),
        location: festival.location?.trim() || null,
        start_date: festival.start_date,
        end_date: festival.end_date,
      })
      .select('id')
      .single()

    if (festivalError || !createdFestival) {
      throw festivalError ?? new Error('Could not create festival')
    }

    const festivalId = createdFestival.id as string
    const stages = body.lineup?.stages ?? []

    if (stages.length > 0) {
      const stagePayload = stages.map((stage, index) => ({
        festival_id: festivalId,
        name: stage.name,
        display_order: index,
      }))

      const { data: createdStages, error: stageError } = await supabase
        .from('stages')
        .insert(stagePayload)
        .select('id, display_order')

      if (stageError || !createdStages) {
        throw stageError ?? new Error('Could not create stages')
      }

      const stageIdByOrder = new Map<number, string>(
        createdStages.map((stage) => [stage.display_order as number, stage.id as string]),
      )

      const slotPayload = stages.flatMap((stage, index) => {
        const stageId = stageIdByOrder.get(index)
        if (!stageId) {
          return []
        }
        return stage.slots.map((slot) => ({
          festival_id: festivalId,
          stage_id: stageId,
          band_name: slot.band_name,
          day: slot.day ?? festival.start_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          confidence: slot.confidence,
        }))
      })

      if (slotPayload.length > 0) {
        const { error: slotError } = await supabase.from('slots').insert(slotPayload)
        if (slotError) {
          throw slotError
        }
      }
    }

    return NextResponse.json({ festival_id: festivalId })
  } catch {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
}
