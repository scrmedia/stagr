import Anthropic from '@anthropic-ai/sdk'
import type { ParsedLineup } from '@/types'

const MODEL_NAME = 'claude-sonnet-4-20250514'

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

export function parseLineupJson(rawText: string): ParsedLineup {
  const startIndex = rawText.indexOf('{')
  const endIndex = rawText.lastIndexOf('}')

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('No JSON payload found in Claude response')
  }

  const jsonText = rawText.slice(startIndex, endIndex + 1)
  const parsed = JSON.parse(jsonText) as ParsedLineup

  if (!parsed.stages || parsed.stages.length === 0) {
    throw new Error('No stages returned from parser')
  }

  return parsed
}

export { MODEL_NAME }
