import { NextResponse } from 'next/server'
import { getAuthedClient } from '@/lib/api'

interface UpdateFestivalBody {
  name?: string
  location?: string | null
  start_date?: string
  end_date?: string
  is_archived?: boolean
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: UpdateFestivalBody
  try {
    body = (await request.json()) as UpdateFestivalBody
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const update: UpdateFestivalBody = {}
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
  if (body.location !== undefined) update.location = body.location?.trim() || null
  if (body.start_date) update.start_date = body.start_date
  if (body.end_date) update.end_date = body.end_date
  if (typeof body.is_archived === 'boolean') update.is_archived = body.is_archived

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // RLS guarantees the row belongs to the user, so no extra ownership check.
  const { error } = await supabase.from('festivals').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user } = await getAuthedClient()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Default action is a soft archive; `?hard=true` permanently removes the
  // festival (stages/slots cascade via FK on delete).
  const hard = new URL(request.url).searchParams.get('hard') === 'true'

  if (hard) {
    const { error } = await supabase.from('festivals').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, deleted: true })
  }

  const { error } = await supabase.from('festivals').update({ is_archived: true }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'archive_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, archived: true })
}
