/**
 * POST /api/admin/ai/drafts/[id]/approve
 * Apply draft to product and mark approved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { syncProductToEquipment } from '@/lib/services/product-equipment-sync.service'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasAIPermission(session.user.id, 'run'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const draft = await prisma.aiContentDraft.findUnique({
    where: { id, status: 'pending' },
    include: { product: { include: { translations: true } } },
  })
  if (!draft)
    return NextResponse.json({ error: 'Draft not found or already processed' }, { status: 404 })

  const data = draft.suggestedData as Record<string, unknown>
  const productId = draft.productId

  if (draft.type === 'text') {
    const seo = data.seo as
      | { metaTitle?: string; metaDescription?: string; metaKeywords?: string }
      | undefined
    const seoByLocale = data.seoByLocale as
      | Record<string, { metaTitle?: string; metaDescription?: string; metaKeywords?: string }>
      | undefined
    const genEn = data.generatedEnDescription as
      | { shortDescription?: string; longDescription?: string }
      | undefined
    const translations = data.translations as
      | Record<string, { name: string; shortDescription: string; longDescription: string }>
      | undefined

    if (genEn || seo) {
      const enUpdate: Record<string, unknown> = {}
      if (seo?.metaTitle) enUpdate.seoTitle = seo.metaTitle
      if (seo?.metaDescription) enUpdate.seoDescription = seo.metaDescription
      if (seo?.metaKeywords) enUpdate.seoKeywords = seo.metaKeywords
      if (genEn?.shortDescription) enUpdate.shortDescription = genEn.shortDescription
      if (genEn?.longDescription) enUpdate.longDescription = genEn.longDescription
      if (Object.keys(enUpdate).length > 0) {
        await prisma.productTranslation.updateMany({
          where: { productId, locale: 'en' },
          data: enUpdate,
        })
      }
    }

    if (translations) {
      for (const [locale, t] of Object.entries(translations)) {
        if (!t?.name) continue
        const localeSeo = seoByLocale?.[locale]
        await prisma.productTranslation.upsert({
          where: { productId_locale: { productId, locale: locale as 'en' | 'ar' | 'zh' } },
          create: {
            productId,
            locale: locale as 'en' | 'ar' | 'zh',
            name: t.name,
            shortDescription: t.shortDescription ?? '',
            longDescription: t.longDescription ?? '',
            seoTitle: localeSeo?.metaTitle ?? '',
            seoDescription: localeSeo?.metaDescription ?? '',
            seoKeywords: localeSeo?.metaKeywords ?? '',
          },
          update: {
            name: t.name,
            shortDescription: t.shortDescription ?? undefined,
            longDescription: t.longDescription ?? undefined,
            ...(localeSeo && {
              seoTitle: localeSeo.metaTitle,
              seoDescription: localeSeo.metaDescription,
              seoKeywords: localeSeo.metaKeywords,
            }),
          },
        })
      }
    }

    if (data.boxContents != null)
      await prisma.product.update({
        where: { id: productId },
        data: { boxContents: String(data.boxContents) },
      })
    if (data.tags != null)
      await prisma.product.update({ where: { id: productId }, data: { tags: String(data.tags) } })
    if (data.relatedProducts != null)
      await prisma.product.update({
        where: { id: productId },
        data: { relatedProducts: data.relatedProducts as object },
      })
  } else if (draft.type === 'spec' && data.specifications) {
    await prisma.productTranslation.updateMany({
      where: { productId, locale: 'en' },
      data: { specifications: data.specifications as object },
    })
  } else if (draft.type === 'photo' && data.galleryImages) {
    await prisma.product.update({
      where: { id: productId },
      data: { galleryImages: data.galleryImages as object },
    })
  }

  await prisma.aiContentDraft.update({
    where: { id },
    data: { status: 'approved', reviewedAt: new Date(), reviewedBy: session.user.id },
  })

  const remainingDrafts = await prisma.aiContentDraft.count({
    where: { productId, status: 'pending' },
  })
  if (remainingDrafts === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { needsAiReview: false, aiReviewReason: null },
    })
  }

  await syncProductToEquipment(productId)

  const { logAiAudit } = await import('@/lib/services/ai-audit.service')
  await logAiAudit({
    userId: session.user.id,
    action: 'draft.approve',
    resourceType: 'AiContentDraft',
    resourceId: id,
    metadata: { productId, type: draft.type },
  })

  // Log feedback for adaptive confidence learning
  try {
    const { logFeedback } = await import('@/lib/services/ai-confidence.service')
    await logFeedback({
      draftId: id,
      contentType: draft.type,
      fieldName: draft.type,
      action: 'approved',
      categoryId: draft.product.categoryId,
    })
  } catch {
    // Non-critical: feedback logging should not block approval
  }

  return NextResponse.json({ success: true })
}
