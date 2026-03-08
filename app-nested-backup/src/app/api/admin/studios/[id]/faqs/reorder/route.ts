/**
 * PUT /api/admin/studios/[id]/faqs/reorder - Reorder FAQs
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { StudioFaqService } from '@/lib/services/studio-faq.service'
import { reorderStudioFaqSchema } from '@/lib/validators/studio-faq.validator'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

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
    const { faqIds } = reorderStudioFaqSchema.parse(body)
    await StudioFaqService.reorder(id, faqIds, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
