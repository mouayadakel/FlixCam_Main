/**
 * @file route.ts
 * @description PATCH approve or reject a pending product image
 * @module app/api/admin/ai/pending-images/[id]
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
})

/**
 * PATCH /api/admin/ai/pending-images/:id
 * Body: { action: "approve" | "reject" }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'review'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  const { id } = await params
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'Invalid body: action must be "approve" or "reject"' },
      { status: 400 }
    )
  }

  try {
    const image = await prisma.productImage.findFirst({
      where: { id, pendingReview: true, isDeleted: false },
      include: { product: true },
    })
    if (!image) {
      return NextResponse.json({ error: 'Pending image not found' }, { status: 404 })
    }

    const userId = session.user.id

    if (body.action === 'approve') {
      await prisma.productImage.update({
        where: { id },
        data: {
          pendingReview: false,
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      })
      await logAiAudit({
        userId,
        action: AI_AUDIT_ACTIONS.IMAGE_APPROVE,
        resourceType: 'ProductImage',
        resourceId: id,
        metadata: { productId: image.productId },
      })
      return NextResponse.json({ ok: true, message: 'تمت الموافقة على الصورة' })
    }

    if (body.action === 'reject') {
      await prisma.productImage.update({
        where: { id },
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
      await logAiAudit({
        userId,
        action: AI_AUDIT_ACTIONS.IMAGE_REJECT,
        resourceType: 'ProductImage',
        resourceId: id,
        metadata: { productId: image.productId },
      })
      return NextResponse.json({ ok: true, message: 'تم رفض الصورة' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Pending image update failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}
