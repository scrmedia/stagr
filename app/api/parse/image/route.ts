import { NextResponse } from 'next/server'
import {
  createAnthropicClient,
  extractTextFromMessage,
  LINEUP_PARSE_PROMPT,
  MODEL_NAME,
  parseLineupJson,
} from '@/lib/claude'

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
  try {
    const body = (await request.json()) as ParseImageBody

    if (!body.image_url?.trim()) {
      return NextResponse.json({ error: 'parse_failed' }, { status: 400 })
    }

    const imageResponse = await fetch(body.image_url)

    if (!imageResponse.ok) {
      throw new Error('Image could not be fetched')
    }

    const contentType = imageResponse.headers.get('content-type')
    const mediaType = resolveMediaType(contentType)
    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64')

    const anthropic = createAnthropicClient()

    const message = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
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
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    })

    const parsedLineup = parseLineupJson(extractTextFromMessage(message))

    return NextResponse.json(parsedLineup)
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
