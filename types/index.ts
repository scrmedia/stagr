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
}

export type UserSlot = {
  id: string
  user_id: string
  slot_id: string
  festival_id: string
}

export type SlotWithStage = Slot & {
  stage: Stage
  is_flagged: boolean
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
