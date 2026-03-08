/**
 * PATCH /api/admin/hero-banners/[id]/slides/[slideId] - Update slide
 * DELETE /api/admin/hero-banners/[id]/slides/[slideId] - Soft delete slide
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { HeroBannerService } from '@/lib/services/hero-banner.service'
import { updateSlideSchema } from '@/lib/validators/hero-banner.validator'
import { ValidationError, NotFoundError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
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
    const { slideId } = await params
    const body = await request.json()
    const data = updateSlideSchema.parse(body)
    const updated = await HeroBannerService.updateSlide(slideId, data, session.user.id)
    return NextResponse.json(updated)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
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
    const { slideId } = await params
    const updated = await HeroBannerService.deleteSlide(slideId, session.user.id)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
