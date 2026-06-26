// sessionStorage key for the parsed-lineup draft handed from the parse step to
// the confirm screen. The confirm screen is the only place a lineup is saved.
export const NEW_FESTIVAL_DRAFT_KEY = 'stagr:new-festival-draft'

export interface FestivalDraft {
  festival: {
    name: string
    location: string
    start_date: string
    end_date: string
  }
  parsed_lineup: {
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
}
