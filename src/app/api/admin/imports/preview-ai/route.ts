/**
 * @file route.ts
 * @description API endpoint for AI preview of import data
 * Generates translations, SEO, specifications, and box contents.
 * @module app/api/admin/imports/preview-ai
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { generateMasterFill } from '@/lib/services/ai-content-generation.service'
import { prisma } from '@/lib/db/prisma'
import { TranslationLocale } from '@prisma/client'

export const dynamic = 'force-dynamic'

type PreviewRow = {
  name: string
  shortDescription?: string
  longDescription?: string
  category?: string
  categoryName?: string
  brand?: string
  specifications?: Record<string, any>
  locale?: TranslationLocale
  boxContents?: string
}

function normalizeSpecs(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const obj = input as Record<string, unknown>
  const entries = Object.entries(obj)
    .map(([k, v]) => [String(k).trim(), v] as const)
    .filter(([k, v]) => k.length > 0 && v != null && String(v).trim() !== '')
    .slice(0, 10)
  return Object.fromEntries(entries)
}

function clampText(s: unknown, max: number): string {
  const str = typeof s === 'string' ? s : s == null ? '' : String(s)
  const trimmed = str.trim()
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function scoreConfidence(output: {
  short_desc_en?: string
  long_desc_en?: string
  seo_title_en?: string
  seo_desc_en?: string
  seo_keywords_en?: string
  name_ar?: string
  name_zh?: string
  box_contents?: string
  tags?: string
}): number {
  let score = 0
  if ((output.short_desc_en?.trim()?.length ?? 0) >= 80) score += 15
  if ((output.long_desc_en?.trim()?.length ?? 0) >= 250) score += 15
  if ((output.seo_title_en?.trim()?.length ?? 0) >= 20) score += 10
  if ((output.seo_desc_en?.trim()?.length ?? 0) >= 80) score += 10
  if ((output.seo_keywords_en?.trim()?.split(',').filter(Boolean).length ?? 0) >= 6) score += 10
  if ((output.name_ar?.trim()?.length ?? 0) >= 4) score += 10
  if ((output.name_zh?.trim()?.length ?? 0) >= 2) score += 10
  if ((output.box_contents?.trim()?.length ?? 0) >= 20) score += 10
  if ((output.tags?.trim()?.split(',').filter(Boolean).length ?? 0) >= 5) score += 10
  return Math.max(0, Math.min(100, score))
}

/**
 * POST /api/admin/imports/preview-ai
 * Generate AI suggestions for sample rows: translations, SEO, specifications, box contents.
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
    const { rows, provider: bodyProvider } = body as {
      rows: PreviewRow[]
      provider?: 'openai' | 'gemini'
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Rows array is required' }, { status: 400 })
    }

    const provider = bodyProvider ?? ((process.env.AI_PROVIDER as 'openai' | 'gemini') || 'gemini')

    const previewRows = rows.slice(0, 10)

    // Resolve category names if category is ID
    const categoryIds = previewRows
      .map((r) => r.category)
      .filter((c): c is string => typeof c === 'string' && c.length > 0)
    const uniqueIds = [...new Set(categoryIds)]
    const categories =
      uniqueIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: uniqueIds }, deletedAt: null },
            select: { id: true, name: true },
          })
        : []
    const categoryNameMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

    const rowsWithCategoryName = previewRows.map((r) => ({
      ...r,
      categoryName:
        r.categoryName ??
        (r.category && categoryNameMap[r.category]) ??
        (typeof r.category === 'string' ? r.category : undefined),
    }))

    const enrichedSuggestions = await Promise.all(
      rowsWithCategoryName.map(async (row, idx) => {
        const category = row.categoryName ?? row.category ?? 'General'
        const brand = row.brand?.trim() || 'Unknown'
        const specs = normalizeSpecs(row.specifications)
        const existingDescription =
          [row.longDescription, row.shortDescription].filter(Boolean).join('\n\n') || null

        const master = await generateMasterFill(provider, {
          name: row.name,
          brand,
          category,
          specifications: Object.keys(specs).length > 0 ? specs : null,
          existingDescription,
        })

        const out = master ?? {
          short_desc_en: row.shortDescription ?? '',
          long_desc_en: row.longDescription ?? '',
          seo_title_en: `Rent ${row.name} in Riyadh | FlixCam`,
          seo_desc_en: `Rent ${row.name} in Riyadh, Saudi Arabia. Book now on FlixCam.`,
          seo_keywords_en: `${row.name}, rent, Riyadh, Saudi Arabia`,
          name_ar: '',
          short_desc_ar: '',
          long_desc_ar: '',
          seo_title_ar: '',
          seo_desc_ar: '',
          seo_keywords_ar: '',
          name_zh: '',
          short_desc_zh: '',
          long_desc_zh: '',
          seo_title_zh: '',
          seo_desc_zh: '',
          seo_keywords_zh: '',
          box_contents: row.boxContents ?? '',
          tags: '',
        }

        const confidence = scoreConfidence(out)

        return {
          rowIndex: idx,
          original: {
            ...previewRows[idx],
            sheetName: (previewRows[idx] as { sheetName?: string }).sheetName,
            excelRowNumber: (previewRows[idx] as { excelRowNumber?: number }).excelRowNumber,
          },
          aiSuggestions: {
            translations: {
              en: {
                name: row.name,
                shortDescription: clampText(out.short_desc_en, 600),
                longDescription: clampText(out.long_desc_en, 2500),
              },
              ar: {
                name: clampText(out.name_ar, 200),
                shortDescription: clampText(out.short_desc_ar, 600),
                longDescription: clampText(out.long_desc_ar, 2500),
              },
              zh: {
                name: clampText(out.name_zh, 200),
                shortDescription: clampText(out.short_desc_zh, 600),
                longDescription: clampText(out.long_desc_zh, 2500),
              },
            },
            seo: {
              metaTitle: clampText(out.seo_title_en, 70),
              metaDescription: clampText(out.seo_desc_en, 160),
              metaKeywords: clampText(out.seo_keywords_en, 500),
            },
            seoByLocale: {
              ar: {
                metaTitle: clampText(out.seo_title_ar, 70),
                metaDescription: clampText(out.seo_desc_ar, 160),
                metaKeywords: clampText(out.seo_keywords_ar, 500),
              },
              zh: {
                metaTitle: clampText(out.seo_title_zh, 70),
                metaDescription: clampText(out.seo_desc_zh, 160),
                metaKeywords: clampText(out.seo_keywords_zh, 500),
              },
            },
            specifications: specs,
            boxContents: clampText(out.box_contents ?? row.boxContents, 2000) || undefined,
            tags: clampText(out.tags, 500) || undefined,
            confidence,
          },
        }
      })
    )

    const totalCost = 0

    return NextResponse.json({
      suggestions: enrichedSuggestions,
      totalCost,
    })
  } catch (error: unknown) {
    console.error('AI preview failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate AI preview',
      },
      { status: 500 }
    )
  }
}
