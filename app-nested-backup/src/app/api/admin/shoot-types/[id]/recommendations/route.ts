/**
 * PUT /api/admin/shoot-types/[id]/recommendations - Bulk update recommendations
 * Body: { categoryId?: string, recommendations: RecommendationItemInput[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import { updateRecommendationsSchema } from '@/lib/validators/shoot-type.validator'
import { NotFoundError, ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateRecommendationsSchema.parse(body)
    await ShootTypeService.setRecommendations(id, parsed.recommendations, parsed.categoryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
    }
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
