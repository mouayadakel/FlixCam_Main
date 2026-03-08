/**
 * GET /api/admin/hero-banners - List all hero banners
 * POST /api/admin/hero-banners - Create hero banner
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { HeroBannerService } from '@/lib/services/hero-banner.service'
import { createBannerSchema } from '@/lib/validators/hero-banner.validator'
import { ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ))) {
    return NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 })
  }

  try {
    const list = await HeroBannerService.getAllBanners()
    return NextResponse.json({ data: list })
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500
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
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - settings.update required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createBannerSchema.parse(body)
    const created = await HeroBannerService.createBanner(data, session.user.id)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
    }
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as { issues: unknown }).issues },
        { status: 400 }
      )
    }
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status }
    )
  }
}
