import { NextResponse } from 'next/server'
import { getAuthedClient } from '@/lib/api'

interface FlagBody {
  slot_id: string
  festival_id: string
  flagged: boolean
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: FlagBody
  try {
    body = (await request.json()) as FlagBody
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.slot_id || !body.festival_id || typeof body.flagged !== 'boolean') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  try {
    if (body.flagged) {
      // Upsert keeps the toggle idempotent under the unique(user_id, slot_id) constraint.
      const { error } = await supabase.from('user_slots').upsert(
        {
          user_id: user.id,
          slot_id: body.slot_id,
          festival_id: body.festival_id,
        },
        { onConflict: 'user_id,slot_id' },
      )
      if (error) {
        throw error
      }
    } else {
      const { error } = await supabase
        .from('user_slots')
        .delete()
        .eq('user_id', user.id)
        .eq('slot_id', body.slot_id)
      if (error) {
        throw error
      }
    }

    return NextResponse.json({ ok: true, flagged: body.flagged })
  } catch {
    return NextResponse.json({ error: 'flag_failed' }, { status: 500 })
  }
}
