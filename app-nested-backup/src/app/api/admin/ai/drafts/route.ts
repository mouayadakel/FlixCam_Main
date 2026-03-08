/**
 * GET /api/admin/ai/drafts
 * List pending AI content drafts (preview workflow).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await hasAIPermission(session.user.id, 'run'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
    if (rateLimitRes) return rateLimitRes

    const drafts = await prisma.aiContentDraft.findMany({
      where: { status: 'pending' },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            translations: { where: { locale: 'en' }, select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ drafts })
  } catch (error) {
    return handleApiError(error)
  }
}
