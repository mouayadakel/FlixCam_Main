/**
 * @file route.ts
 * @description GET list of product images pending AI review (with optional filters)
 * @module app/api/admin/ai/pending-images
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ImageSource } from '@prisma/client'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

const VALID_IMAGE_SOURCES = [
  'UPLOAD',
  'BRAND_ASSET',
  'AI_GENERATED',
  'STOCK_PHOTO',
  'WEB_SCRAPED',
] as const

export const dynamic = 'force-dynamic'

const pendingImagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
  productId: z.string().cuid().optional(),
  source: z.enum(VALID_IMAGE_SOURCES).optional(),
  sort: z.enum(['createdAt', 'qualityScore']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * GET /api/admin/ai/pending-images
 * Query: productId?, source?, limit?, page?, sort?, order?
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = pendingImagesSchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { limit, page, productId, source, sort, order } = parsed.data

  const where: Prisma.ProductImageWhereInput = {
    pendingReview: true,
    isDeleted: false,
    ...(productId ? { productId } : {}),
    ...(source ? { imageSource: source as ImageSource } : {}),
  }

  try {
    const [items, total] = await Promise.all([
      prisma.productImage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              translations: {
                select: { locale: true, name: true },
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      prisma.productImage.count({ where }),
    ])

    const list = items.map((img) => {
      const ar = img.product.translations.find((t) => t.locale === 'ar')
      const en = img.product.translations.find((t) => t.locale === 'en')
      const productName =
        ar?.name ??
        en?.name ??
        img.product.translations[0]?.name ??
        img.product.sku ??
        img.product.id
      return {
        id: img.id,
        url: img.url,
        imageSource: img.imageSource,
        qualityScore: img.qualityScore,
        productId: img.productId,
        productName,
        createdAt: img.createdAt,
      }
    })

    return NextResponse.json({
      items: list,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Pending images fetch failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pending images' },
      { status: 500 }
    )
  }
}
