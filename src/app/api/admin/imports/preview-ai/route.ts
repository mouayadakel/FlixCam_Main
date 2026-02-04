/**
 * @file route.ts
 * @description API endpoint for AI preview of import data
 * @module app/api/admin/imports/preview-ai
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { autofillProductsBatch } from '@/lib/services/ai-autofill.service'
import { TranslationLocale } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imports/preview-ai
 * Generate AI suggestions for sample rows
 */
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { rows, provider } = body as {
      rows: Array<{
        name: string
        shortDescription?: string
        longDescription?: string
        category?: string
        brand?: string
        specifications?: Record<string, any>
        locale?: TranslationLocale
      }>
      provider?: 'openai' | 'gemini'
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Rows array is required' }, { status: 400 })
    }

    // Limit to 10 rows for preview
    const previewRows = rows.slice(0, 10)

    // Generate AI suggestions
    const suggestions = await autofillProductsBatch(previewRows, provider)

    return NextResponse.json({
      suggestions: suggestions.map((suggestion, idx) => ({
        rowIndex: idx,
        original: previewRows[idx],
        aiSuggestions: {
          translations: suggestion.translations,
          seo: suggestion.seo,
          cost: suggestion.cost,
        },
      })),
      totalCost: suggestions.reduce((sum, s) => sum + (s.cost || 0), 0),
    })
  } catch (error: any) {
    console.error('AI preview failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI preview' },
      { status: 500 }
    )
  }
}
