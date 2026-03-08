import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ProductCatalogService } from '@/lib/services/product-catalog.service'
import { ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { ProductStatus, ProductType, TranslationLocale, InventoryItemStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
    return NextResponse.json({ error: 'Forbidden - equipment.read required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit
    const where = { deletedAt: null }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          translations: { select: { locale: true, name: true }, where: { locale: 'en' } },
          _count: { select: { inventoryItems: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const items = products.map((p) => ({
      id: p.id,
      name: p.translations[0]?.name || 'Untitled',
      sku: p.sku || '',
      category: p.category?.name || '—',
      brand: p.brand?.name || '—',
      status: p.status.toLowerCase(),
      stock: p.quantity ?? p._count.inventoryItems,
      quantity: p.quantity ?? null,
      updatedAt: p.updatedAt,
      boxMissing: !p.boxContents || p.boxContents.trim().length === 0,
    }))

    return NextResponse.json({
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('List products failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_CREATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.create required' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const product = await ProductCatalogService.create({
      status: body.status as ProductStatus | undefined,
      productType: body.productType as ProductType | undefined,
      sku: body.sku ?? null,
      brandId: body.brandId,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId ?? null,
      priceDaily: body.priceDaily,
      priceWeekly: body.priceWeekly,
      priceMonthly: body.priceMonthly,
      depositAmount: body.depositAmount,
      quantity: body.quantity,
      bufferTime: body.bufferTime,
      boxContents: body.boxContents ?? null,
      featuredImage: body.featuredImage,
      galleryImages: body.galleryImages ?? null,
      videoUrl: body.videoUrl ?? null,
      relatedProducts: body.relatedProducts ?? null,
      tags: body.tags ?? null,
      translations: (body.translations || []).map((t: any) => ({
        locale: t.locale as TranslationLocale,
        name: t.name,
        shortDescription: t.shortDescription,
        longDescription: t.longDescription,
        specifications: t.specifications ?? null,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        seoKeywords: t.seoKeywords,
      })),
      inventoryItems: (body.inventoryItems || []).map((item: any) => ({
        serialNumber: item.serialNumber,
        barcode: item.barcode,
        itemStatus: item.itemStatus as InventoryItemStatus,
        location: item.location ?? null,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
        purchasePrice: item.purchasePrice ?? null,
      })),
      createdBy: session.user.id,
    })

    return NextResponse.json({ productId: product.id }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
    }
    console.error('Create product failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
