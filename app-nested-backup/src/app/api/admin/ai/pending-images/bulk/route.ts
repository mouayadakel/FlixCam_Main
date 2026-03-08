/**
 * @file route.ts
 * @description POST bulk approve or reject pending images
 * @module app/api/admin/ai/pending-images/bulk
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { logAiAudit, AI_AUDIT_ACTIONS } from '@/lib/services/ai-audit.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  ids: z.array(z.string().cuid()).min(1).max(50),
})

/**
 * POST /api/admin/ai/pending-images/bulk
 * Body: { action: "approve" | "reject", ids: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'review'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'Invalid body: action must be "approve" or "reject", ids non-empty array (max 50)' },
      { status: 400 }
    )
  }

  const userId = session.user.id

  try {
    const images = await prisma.productImage.findMany({
      where: { id: { in: body.ids }, pendingReview: true, isDeleted: false },
      include: { product: true },
    })

    for (const image of images) {
      if (body.action === 'approve') {
        await prisma.productImage.update({
          where: { id: image.id },
          data: {
            pendingReview: false,
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        })
      } else {
        await prisma.productImage.update({
          where: { id: image.id },
          data: {
            pendingReview: false,
            isDeleted: true,
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        })
        const gallery = (image.product.galleryImages as string[] | null) ?? []
        const updatedGallery = gallery.filter((u) => u !== image.url)
        await prisma.product.update({
          where: { id: image.productId },
          data: { galleryImages: updatedGallery },
        })
      }
    }

    await logAiAudit({
      userId,
      action:
        body.action === 'approve' ? AI_AUDIT_ACTIONS.IMAGE_APPROVE : AI_AUDIT_ACTIONS.IMAGE_REJECT,
      resourceType: 'ProductImage',
      metadata: { count: images.length, ids: body.ids },
    })

    return NextResponse.json({
      ok: true,
      processed: images.length,
      message:
        body.action === 'approve'
          ? `تمت الموافقة على ${images.length} صورة`
          : `تم رفض ${images.length} صورة`,
    })
  } catch (error) {
    console.error('Bulk pending images update failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk update failed' },
      { status: 500 }
    )
  }
}
