/**
 * POST /api/admin/ai/drafts/[id]/reject
 * Mark draft as rejected (no apply).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasAIPermission(session.user.id, 'run'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let rejectionReason: string | undefined
  try {
    const body = await request.json()
    rejectionReason = body.rejectionReason
  } catch {
    // No body is fine
  }

  const draft = await prisma.aiContentDraft.findUnique({
    where: { id, status: 'pending' },
    include: { product: { select: { categoryId: true } } },
  })

  const updated = await prisma.aiContentDraft.updateMany({
    where: { id, status: 'pending' },
    data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: session.user.id },
  })

  if (updated.count > 0) {
    const { logAiAudit } = await import('@/lib/services/ai-audit.service')
    await logAiAudit({
      userId: session.user.id,
      action: 'draft.reject',
      resourceType: 'AiContentDraft',
      resourceId: id,
      metadata: { rejectionReason },
    })

    try {
      const { logFeedback } = await import('@/lib/services/ai-confidence.service')
      await logFeedback({
        draftId: id,
        contentType: draft?.type || 'unknown',
        fieldName: draft?.type || 'unknown',
        action: 'rejected',
        rejectionReason,
        categoryId: draft?.product?.categoryId,
      })
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({ success: true })
}
