import { NextResponse } from 'next/server'
import {
  createAnthropicClient,
  extractTextFromMessage,
  LineupParseError,
  LINEUP_PARSE_PROMPT,
  MODEL_NAME,
  parseLineupJson,
} from '@/lib/claude'
import { getAuthedClient } from '@/lib/api'

interface ParseTextBody {
  text: string
  festival_name: string
}

export async function POST(request: Request) {
  const { user } = await getAuthedClient()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'parse_failed', message: 'AI parsing is not configured.' },
      { status: 503 },
    )
  }

  let body: ParseTextBody
  try {
    body = (await request.json()) as ParseTextBody
  } catch {
    return NextResponse.json({ error: 'parse_failed', message: 'Invalid request.' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: 'parse_failed', message: 'No text to parse.' },
      { status: 400 },
    )
  }

  try {
    const anthropic = createAnthropicClient()
    const message = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 8192,
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
  } catch (error) {
    if (error instanceof LineupParseError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 422 })
    }
    return NextResponse.json(
      { error: 'parse_failed', message: 'We could not read that lineup.' },
      { status: 500 },
    )
  }
}
