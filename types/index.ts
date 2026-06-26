export type Festival = {
  id: string
  user_id: string
  name: string
  location: string | null
  start_date: string
  end_date: string
  is_archived: boolean
  created_at: string
}

export type Stage = {
  id: string
  festival_id: string
  name: string
  display_order: number
}

export type Slot = {
  id: string
  stage_id: string
  festival_id: string
  band_name: string
  day: string
  start_time: string
  end_time: string
  confidence: 'high' | 'low'
}

export type UserSlot = {
  id: string
  user_id: string
  slot_id: string
  festival_id: string
}

export type Profile = {
  id: string
  email: string | null
  is_premium: boolean
  created_at: string
}

export type SlotWithStage = Slot & {
  stage: Stage
  is_flagged: boolean
}

// Full bundle of data for one festival, fetched server-side for the app views.
export type FestivalData = {
  festival: Festival
  stages: Stage[]
  slots: SlotWithStage[]
  days: string[]
}

export type ParsedLineup = {
  stages: {
    name: string
    slots: {
      band_name: string
      day: string | null
      start_time: string
      end_time: string
      confidence: 'high' | 'low'
    }[]
  }[]
}
