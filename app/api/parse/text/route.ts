import { NextResponse } from 'next/server'
import {
  createAnthropicClient,
  extractTextFromMessage,
  LINEUP_PARSE_PROMPT,
  MODEL_NAME,
  parseLineupJson,
} from '@/lib/claude'

interface ParseTextBody {
  text: string
  festival_name: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseTextBody

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'parse_failed' }, { status: 400 })
    }

    const anthropic = createAnthropicClient()

    const message = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `${LINEUP_PARSE_PROMPT}\n\nFestival name: ${body.festival_name}\n\nRaw lineup text:\n${body.text}`,
        },
      ],
    })

    const parsedLineup = parseLineupJson(extractTextFromMessage(message))

    return NextResponse.json(parsedLineup)
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
