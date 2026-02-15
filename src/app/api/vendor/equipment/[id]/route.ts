/**
 * GET /api/vendor/equipment/[id] - Get single equipment (vendor's own)
 * PATCH /api/vendor/equipment/[id] - Update equipment (vendor's own, pre-approval fields only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { EquipmentService } from '@/lib/services/equipment.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  model: z.string().max(255).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).optional(),
  specifications: z.record(z.unknown()).optional(),
  featuredImageUrl: z.string().url().optional().nullable(),
  galleryImageUrls: z.array(z.string().url()).optional(),
  videoUrl: z.string().url().optional().nullable(),
  boxContents: z.string().optional().nullable(),
  bufferTime: z.number().int().min(0).optional().nullable(),
  bufferTimeUnit: z.enum(['hours', 'days']).optional().nullable(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) {
    return NextResponse.json(
      { error: 'Vendor account not found or not approved' },
      { status: 403 }
    )
  }

  const { id } = await params
  const equipment = await prisma.equipment.findFirst({
    where: { id, vendorId: vendor.id, deletedAt: null },
    include: {
      category: true,
      brand: true,
      media: { where: { deletedAt: null } },
    },
  })

  if (!equipment) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
  }

  return NextResponse.json(equipment)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await prisma.vendor.findFirst({
    where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
  })
  if (!vendor) {
    return NextResponse.json(
      { error: 'Vendor account not found or not approved' },
      { status: 403 }
    )
  }

  const { id } = await params
  const equipment = await prisma.equipment.findFirst({
    where: { id, vendorId: vendor.id, deletedAt: null },
  })
  if (!equipment) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
  }

  const customFields = (equipment.customFields as Record<string, unknown>) || {}
  const status = customFields.vendorSubmissionStatus as string | undefined
  if (status === 'approved') {
    return NextResponse.json(
      { error: 'Approved equipment cannot be edited by vendor. Contact admin.' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const sanitized = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === null ? undefined : v])
  ) as Record<string, unknown>
  const updateData = {
    id,
    updatedBy: session.user.id,
    ...sanitized,
  } as Parameters<typeof EquipmentService.updateEquipment>[0]

  const updated = await EquipmentService.updateEquipment(updateData)
  return NextResponse.json(updated)
}
