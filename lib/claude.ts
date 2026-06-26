import Anthropic from '@anthropic-ai/sdk'
import type { ParsedLineup } from '@/types'

// The lineup parser model. The originally specified claude-sonnet-4-20250514 has
// been retired; claude-sonnet-4-6 is the current Sonnet (vision + strong JSON).
const MODEL_NAME = 'claude-sonnet-4-6'

export const LINEUP_PARSE_PROMPT = `You are parsing a music festival lineup. Extract all band/artist names, their stage, and their set times.

Return ONLY valid JSON matching this exact structure — no preamble, no explanation:
{
  "stages": [
    {
      "name": "Stage name",
      "slots": [
        {
          "band_name": "Artist name",
          "day": "YYYY-MM-DD or null if unknown",
          "start_time": "HH:MM (24hr)",
          "end_time": "HH:MM (24hr)",
          "confidence": "high or low"
        }
      ]
    }
  ]
}

Rules:
- Use 24hr time format
- If you cannot determine a time with confidence, mark confidence as "low"
- If day cannot be determined, set day to null
- If end time is not given, estimate based on typical set length (45min unless headliner, then 90min)
- Include every act you can identify
- Stage names should match exactly as written in the source`

export function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export function extractTextFromMessage(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
}

export type ParseErrorCode = 'parse_failed' | 'no_content'

export class LineupParseError extends Error {
  code: ParseErrorCode

  constructor(code: ParseErrorCode, message: string) {
    super(message)
    this.name = 'LineupParseError'
    this.code = code
  }
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (TIME_PATTERN.test(trimmed)) {
    // Pad single-digit hours to HH:MM for consistent sorting and display.
    const [hours, minutes] = trimmed.split(':')
    return `${hours.padStart(2, '0')}:${minutes}`
  }

  return fallback
}

function normalizeDay(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

/**
 * Extracts and validates the ParsedLineup JSON from a raw Claude response.
 * Claude sometimes wraps JSON in markdown fences or adds stray prose, so we
 * slice from the first `{` to the last `}` before parsing. Throws a typed
 * LineupParseError so API routes can return precise error codes.
 */
export function parseLineupJson(rawText: string): ParsedLineup {
  const startIndex = rawText.indexOf('{')
  const endIndex = rawText.lastIndexOf('}')

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new LineupParseError('parse_failed', 'No JSON payload found in Claude response')
  }

  const jsonText = rawText.slice(startIndex, endIndex + 1)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new LineupParseError('parse_failed', 'Claude returned malformed JSON')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { stages?: unknown }).stages)
  ) {
    throw new LineupParseError('parse_failed', 'Parsed payload is missing a stages array')
  }

  const rawStages = (parsed as { stages: unknown[] }).stages

  const stages: ParsedLineup['stages'] = rawStages
    .map((rawStage) => {
      if (typeof rawStage !== 'object' || rawStage === null) {
        return null
      }

      const stage = rawStage as { name?: unknown; slots?: unknown }
      const name = typeof stage.name === 'string' && stage.name.trim() ? stage.name.trim() : 'Stage'
      const rawSlots = Array.isArray(stage.slots) ? stage.slots : []

      const slots = rawSlots
        .map((rawSlot) => {
          if (typeof rawSlot !== 'object' || rawSlot === null) {
            return null
          }

          const slot = rawSlot as Record<string, unknown>
          const bandName =
            typeof slot.band_name === 'string' && slot.band_name.trim() ? slot.band_name.trim() : null

          if (!bandName) {
            return null
          }

          const startTime = normalizeTime(slot.start_time, '12:00')
          const endTime = normalizeTime(slot.end_time, startTime)

          return {
            band_name: bandName,
            day: normalizeDay(slot.day),
            start_time: startTime,
            end_time: endTime,
            confidence: slot.confidence === 'high' ? ('high' as const) : ('low' as const),
          }
        })
        .filter((slot): slot is ParsedLineup['stages'][number]['slots'][number] => slot !== null)

      return { name, slots }
    })
    .filter((stage): stage is ParsedLineup['stages'][number] => stage !== null && stage.slots.length > 0)

  if (stages.length === 0) {
    throw new LineupParseError('no_content', 'No stages or acts could be identified')
  }

  return { stages }
}

export { MODEL_NAME }
