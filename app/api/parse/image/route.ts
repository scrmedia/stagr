import { NextResponse } from 'next/server'
import {
  createAnthropicClient,
  extractTextFromMessage,
  LineupParseError,
  LINEUP_PARSE_PROMPT,
  MODEL_NAME,
  parseLineupJson,
} from '@/lib/claude'
import { getAuthedClient, isPremiumUser } from '@/lib/api'

interface ParseImageBody {
  image_url: string
  festival_name: string
}

function resolveMediaType(contentType: string | null): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (contentType === 'image/png') {
    return 'image/png'
  }
  if (contentType === 'image/webp') {
    return 'image/webp'
  }
  return 'image/jpeg'
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Image parsing is a premium feature — gate it server-side.
  const isPremium = await isPremiumUser(supabase, user.id)
  if (!isPremium) {
    return NextResponse.json(
      { error: 'premium_required', message: 'Image parsing is a premium feature.' },
      { status: 403 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'parse_failed', message: 'AI parsing is not configured.' },
      { status: 503 },
    )
  }

  let body: ParseImageBody
  try {
    body = (await request.json()) as ParseImageBody
  } catch {
    return NextResponse.json({ error: 'parse_failed', message: 'Invalid request.' }, { status: 400 })
  }

  if (!body.image_url?.trim()) {
    return NextResponse.json(
      { error: 'parse_failed', message: 'No image provided.' },
      { status: 400 },
    )
  }

  try {
    const imageResponse = await fetch(body.image_url)
    if (!imageResponse.ok) {
      throw new LineupParseError('parse_failed', 'Image could not be fetched')
    }

    const contentType = imageResponse.headers.get('content-type')
    const mediaType = resolveMediaType(contentType)
    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64')

    const anthropic = createAnthropicClient()
    const message = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${LINEUP_PARSE_PROMPT}\n\nFestival name: ${body.festival_name}`,
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
          ],
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
      { error: 'parse_failed', message: 'We could not read that image.' },
      { status: 500 },
    )
  }
}
