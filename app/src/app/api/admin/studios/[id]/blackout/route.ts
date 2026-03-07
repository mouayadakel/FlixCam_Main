/**
 * GET /api/admin/studios/[id]/blackout - List blackout dates
 * POST /api/admin/studios/[id]/blackout - Add blackout date
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { StudioService } from '@/lib/services/studio.service'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional().nullable(),
})

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
    const blackouts = await prisma.studioBlackoutDate.findMany({
      where: { studioId: id, deletedAt: null },
      orderBy: { startDate: 'asc' },
    })
    return NextResponse.json({ data: blackouts })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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
    const data = createSchema.parse(body)
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }
    const blackout = await StudioService.addBlackoutDate(
      id,
      {
        startDate,
        endDate,
        reason: data.reason ?? undefined,
      },
      session.user.id
    )
    return NextResponse.json(blackout, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: e.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
