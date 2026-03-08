/**
 * POST /api/admin/equipment/fetch-specs
 * Fetch a product page URL and extract specifications using AI.
 * Body: { url: string, categoryHint?: string }
 * Returns: { specifications: StructuredSpecifications }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { fetchPageText } from '@/lib/utils/fetch-page-text'
import { AIService } from '@/lib/services/ai.service'
import { ValidationError } from '@/lib/errors'
import type { StructuredSpecifications } from '@/lib/types/specifications.types'
import { z } from 'zod'

const bodySchema = z.object({
  url: z.string().url(),
  categoryHint: z.string().optional(),
})

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (
    !(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE)) &&
    !(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_CREATE))
  ) {
    return NextResponse.json(
      { error: 'Forbidden - equipment.update or equipment.create required' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { url, categoryHint } = bodySchema.parse(body)

    const fetchResult = await fetchPageText(url)
    if (!fetchResult.success) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${fetchResult.error}` },
        { status: 400 }
      )
    }

    const extracted = await AIService.extractSpecificationsFromProductPage(
      fetchResult.text,
      categoryHint
    )

    const specifications: StructuredSpecifications = {
      highlights: extracted.highlights,
      quickSpecs: extracted.quickSpecs,
      groups: extracted.groups.map((g, i) => ({
        ...g,
        priority: g.priority ?? i + 1,
        specs: (g.specs ?? []).map((s) => ({
          ...s,
          key: s.key || `spec_${Math.random().toString(36).slice(2, 8)}`,
          label: s.label || '—',
          value: s.value ?? '—',
        })),
      })),
    }

    return NextResponse.json({ specifications })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      )
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extract specifications',
      },
      { status: 500 }
    )
  }
}
