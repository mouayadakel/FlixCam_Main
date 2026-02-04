import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        translations: { select: { locale: true, name: true }, where: { locale: 'en' } },
        _count: { select: { inventoryItems: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

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

    return NextResponse.json({ items })
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
