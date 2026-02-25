/**
 * POST /api/public/compare/summary
 * Body: { ids: string[] }. Returns AI-generated comparison summary in Arabic.
 * Rate limited: 1 call per comparison (ids set) per 10 minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { AIService } from '@/lib/services/ai.service'

const RATE_LIMIT_MS = 10 * 60 * 1000
const rateLimitMap = new Map<string, number>()

export async function POST(req: NextRequest) {
  let body: { ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const ids = body.ids
  if (!Array.isArray(ids) || ids.length < 2) {
    return NextResponse.json(
      { error: 'Need at least 2 IDs' },
      { status: 400 }
    )
  }

  const cacheKey = [...ids].sort().join(',')
  const lastCall = rateLimitMap.get(cacheKey)
  if (lastCall != null && Date.now() - lastCall < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: 'Rate limited. Try again later.' },
      { status: 429 }
    )
  }
  rateLimitMap.set(cacheKey, Date.now())

  const items = await prisma.equipment.findMany({
    where: { id: { in: ids } },
    select: {
      model: true,
      nameEn: true,
      specifications: true,
      dailyPrice: true,
      category: { select: { name: true } },
    },
  })

  const prompt = `You are a cinema equipment expert helping a rental customer decide between these items:

${items
  .map(
    (item, i) => `
ITEM ${i + 1}: ${item.model ?? item.nameEn ?? 'Unknown'}
Category: ${item.category?.name ?? 'N/A'}
Daily Price: ${item.dailyPrice != null ? `$${Number(item.dailyPrice)}` : 'N/A'}
Key Specs: ${JSON.stringify(item.specifications, null, 2).slice(0, 500)}
`
  )
  .join('\n---\n')}

Write a SHORT, practical comparison in Arabic. Include:
1. "الأفضل لـ..." — use case recommendations for each item (1 line each)
2. "الفرق الرئيسي" — 2-3 key differences that matter most
3. "توصيتنا" — one clear recommendation sentence

Keep total response under 150 words. Be specific, not generic.`

  try {
    const summary = await AIService.generateText(prompt, {
      maxTokens: 300,
      temperature: 0.4,
    })
    return NextResponse.json({ summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI service error'
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI summary is not configured' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
