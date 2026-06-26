import { NextResponse } from 'next/server'
import { getAuthedClient } from '@/lib/api'
import { getFestivalData } from '@/lib/festivals'

/**
 * Returns the full festival bundle (stages, slots with the user's flags, days)
 * for the live day view. The client computes now / next reactively against its
 * own clock, so this endpoint stays a plain snapshot suitable for polling.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ festival_id: string }> }) {
  const { festival_id } = await params
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const data = await getFestivalData(supabase, festival_id)
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
