/**
 * GET /api/vendor/equipment - List vendor's equipment
 * POST /api/vendor/equipment - Submit new equipment (vendor)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { EquipmentService } from '@/lib/services/equipment.service'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  sku: z.string().min(1).max(100),
  model: z.string().max(255).optional(),
  categoryId: z.string().min(1),
  brandId: z.string().optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).optional(),
  quantityTotal: z.number().int().positive().optional(),
  specifications: z.record(z.unknown()).optional(),
  featuredImageUrl: z.string().url().optional(),
  galleryImageUrls: z.array(z.string().url()).optional(),
  videoUrl: z.string().url().optional(),
  boxContents: z.string().optional(),
  bufferTime: z.number().int().min(0).optional(),
  bufferTimeUnit: z.enum(['hours', 'days']).optional(),
  translations: z
    .array(
      z.object({
        locale: z.enum(['ar', 'en', 'zh']),
        name: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
      })
    )
    .optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json(
      { error: 'Vendor account not found or not approved' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const skip = parseInt(searchParams.get('skip') || '0')
  const take = parseInt(searchParams.get('take') || '50')
  const isActive = searchParams.get('isActive')
  const filters: { skip: number; take: number; isActive?: boolean } = { skip, take }
  if (isActive !== null && isActive !== undefined) {
    filters.isActive = isActive === 'true'
  }

  const result = await VendorService.getVendorEquipment(
    vendor.id,
    filters,
    session.user.id
  )
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json(
      { error: 'Vendor account not found or not approved' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = parsed.data
  const categories = await prisma.category.findMany({ where: { deletedAt: null } })
  const categoryIds = categories.map((c) => c.id)
  if (!categoryIds.includes(data.categoryId)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const equipment = await EquipmentService.createEquipment({
    ...data,
    dailyPrice: 0,
    isActive: false,
    vendorId: vendor.id,
    vendorSubmissionStatus: 'pending_review',
    createdBy: session.user.id,
    translations: data.translations,
  })

  return NextResponse.json(equipment, { status: 201 })
}
