/**
 * PUT /api/admin/studios/[id]/testimonials/[testimonialId] - Update testimonial
 * DELETE /api/admin/studios/[id]/testimonials/[testimonialId] - Soft delete testimonial
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { StudioTestimonialService } from '@/lib/services/studio-testimonial.service'
import { updateStudioTestimonialSchema } from '@/lib/validators/studio-testimonial.validator'
import { ValidationError, NotFoundError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testimonialId: string }> }
) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { testimonialId } = await params
    const body = await request.json()
    const data = updateStudioTestimonialSchema.parse(body)
    const testimonial = await StudioTestimonialService.update(testimonialId, data, session.user.id)
    return NextResponse.json(testimonial)
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
  { params }: { params: Promise<{ id: string; testimonialId: string }> }
) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { testimonialId } = await params
    await StudioTestimonialService.delete(testimonialId, session.user.id)
    return NextResponse.json({ success: true })
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
