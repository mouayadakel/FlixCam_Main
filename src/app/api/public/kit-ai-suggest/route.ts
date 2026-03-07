/**
 * POST /api/public/kit-ai-suggest - Get AI suggestions and matching prebuilt kits (no auth).
 * Body: { shootTypeId?: string, shootTypeSlug?: string, budgetTier?: string, questionnaireAnswers?: Record<string, string|string[]>, currentSelections: string[], duration: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import { AIService } from '@/lib/services/ai.service'
import { z } from 'zod'

const bodySchema = z.object({
  shootTypeId: z.string().optional(),
  shootTypeSlug: z.string().optional(),
  budgetTier: z.enum(['ESSENTIAL', 'PROFESSIONAL', 'PREMIUM']).optional().nullable(),
  questionnaireAnswers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  currentSelections: z.array(z.string()).default([]),
  duration: z.number().int().min(1).max(365).default(7),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = bodySchema.parse(body)

    const matchingPrebuiltKits = await ShootTypeService.findMatchingPrebuiltKits(
      parsed.currentSelections
    )

    const projectType = parsed.shootTypeSlug ?? parsed.shootTypeId ?? 'custom'
    const budget =
      parsed.budgetTier === 'PREMIUM' ? 15000 : parsed.budgetTier === 'PROFESSIONAL' ? 8000 : 3000
    const kits = await AIService.buildKit({
      projectType,
      duration: parsed.duration,
      budget,
      excludeEquipmentIds: parsed.currentSelections,
      shootTypeId: parsed.shootTypeId,
      shootTypeSlug: parsed.shootTypeSlug,
      budgetTier: parsed.budgetTier ?? undefined,
      questionnaireAnswers: parsed.questionnaireAnswers,
    })

    const suggestions = kits.length > 0 ? kits[0].equipment : []
    return NextResponse.json({
      suggestions: suggestions.map((e) => ({
        equipmentId: e.equipmentId,
        equipmentName: e.equipmentName,
        sku: e.sku,
        quantity: e.quantity,
        dailyPrice: e.dailyPrice,
        role: e.role,
        reason: e.reason,
      })),
      matchingPrebuiltKits,
    })
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as { issues: unknown }).issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
