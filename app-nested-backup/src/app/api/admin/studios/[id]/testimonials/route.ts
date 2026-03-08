/**
 * GET /api/admin/studios/[id]/testimonials - List testimonials
 * POST /api/admin/studios/[id]/testimonials - Create testimonial
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { StudioTestimonialService } from '@/lib/services/studio-testimonial.service'
import { createStudioTestimonialSchema } from '@/lib/validators/studio-testimonial.validator'
import { prisma } from '@/lib/db/prisma'
import { ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_READ))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const testimonials = await StudioTestimonialService.list(id)
    return NextResponse.json({ data: testimonials })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const body = await request.json()
    const data = createStudioTestimonialSchema.parse(body)
    const testimonial = await StudioTestimonialService.create(
      id,
      {
        ...data,
        role: data.role ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
      },
      session.user.id
    )
    return NextResponse.json(testimonial, { status: 201 })
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
