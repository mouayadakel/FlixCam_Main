import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ProductCatalogService } from '@/lib/services/product-catalog.service'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { ProductStatus, ProductType, TranslationLocale, InventoryItemStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const product = await prisma.product.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        translations: true,
        inventoryItems: true,
      },
    })

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Fetch product failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const product = await ProductCatalogService.update(params.id, {
      status: body.status as ProductStatus | undefined,
      productType: body.productType as ProductType | undefined,
      sku: body.sku ?? undefined,
      brandId: body.brandId,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId ?? undefined,
      priceDaily: body.priceDaily,
      priceWeekly: body.priceWeekly,
      priceMonthly: body.priceMonthly,
      depositAmount: body.depositAmount,
      quantity: body.quantity,
      bufferTime: body.bufferTime,
      boxContents: body.boxContents ?? undefined,
      featuredImage: body.featuredImage,
      galleryImages: body.galleryImages ?? undefined,
      videoUrl: body.videoUrl ?? undefined,
      relatedProducts: body.relatedProducts ?? undefined,
      tags: body.tags ?? undefined,
      translations: body.translations
        ? (body.translations as any[]).map((t) => ({
            locale: t.locale as TranslationLocale,
            name: t.name,
            shortDescription: t.shortDescription,
            longDescription: t.longDescription,
            specifications: t.specifications ?? null,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            seoKeywords: t.seoKeywords,
          }))
        : undefined,
      inventoryItems: body.inventoryItems
        ? (body.inventoryItems as any[]).map((item) => ({
            serialNumber: item.serialNumber,
            barcode: item.barcode,
            itemStatus: item.itemStatus as InventoryItemStatus,
            location: item.location ?? null,
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
            purchasePrice: item.purchasePrice ?? null,
          }))
        : undefined,
      updatedBy: session.user.id,
    })

    return NextResponse.json({ productId: product.id }, { status: 200 })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('Update product failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    console.error('Delete product failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
