/**
 * GET /api/admin/shoot-types - List shoot types (admin)
 * POST /api/admin/shoot-types - Create shoot type
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import { createShootTypeSchema } from '@/lib/validators/shoot-type.validator'
import { ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
    return NextResponse.json({ error: 'Forbidden - equipment.read required' }, { status: 403 })
  }

  try {
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
    const list = await ShootTypeService.getAll(includeInactive)
    return NextResponse.json({ data: list })
  } catch (error) {
    const status = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_CREATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.create required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createShootTypeSchema.parse(body)
    const created = await ShootTypeService.create(data, session.user.id)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
    }
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 })
    }
    const status = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status }
    )
  }
}
