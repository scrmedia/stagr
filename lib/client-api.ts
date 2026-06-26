import type { ParsedLineup } from '@/types'

/** Toggle a slot flag for the current user. Throws on failure so callers can roll back optimistic UI. */
export async function postFlag(slotId: string, festivalId: string, flagged: boolean): Promise<void> {
  const response = await fetch('/api/slots/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, festival_id: festivalId, flagged }),
  })
  if (!response.ok) {
    throw new Error('flag_failed')
  }
}

export type CreateFestivalInput = {
  festival: { name: string; location?: string | null; start_date: string; end_date: string }
  lineup: ParsedLineup
}

export type CreateFestivalResult =
  | { ok: true; festivalId: string }
  | { ok: false; error: 'limit_reached' | 'save_failed' | 'unauthorized' | 'unknown' }

export async function createFestival(input: CreateFestivalInput): Promise<CreateFestivalResult> {
  try {
    const response = await fetch('/api/festivals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = (await response.json()) as { festival_id?: string; error?: string }
    if (response.ok && data.festival_id) {
      return { ok: true, festivalId: data.festival_id }
    }
    if (data.error === 'limit_reached') {
      return { ok: false, error: 'limit_reached' }
    }
    if (data.error === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return { ok: false, error: 'save_failed' }
  } catch {
    return { ok: false, error: 'unknown' }
  }
}
