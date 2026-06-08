/**
 * @file route.ts
 * @description Single kit – get, update, delete
 * @module app/api/kits/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateKitSchema } from '@/lib/validators/kit.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { Decimal } from '@prisma/client/runtime/library'

function shapeKit(kit: {
  id: string
  name: string
  nameEn: string | null
  nameZh: string | null
  slug: string
  description: string | null
  descriptionEn: string | null
  descriptionZh: string | null
  discountPercent: Decimal | null
  isActive: boolean
  cmsData: any
  createdAt: Date
  updatedAt: Date
  items: Array<{
    equipmentId: string
    quantity: number
    equipment: { id: string; sku: string; model: string | null; dailyPrice: Decimal }
  }>
}) {
  let sumDaily = 0
  kit.items.forEach((i) => {
    sumDaily += Number(i.equipment.dailyPrice ?? 0) * i.quantity
  })
  const discount = Number(kit.discountPercent ?? 0) / 100
  const finalDaily = sumDaily * (1 - discount)
  return {
    id: kit.id,
    name: kit.name,
    nameEn: kit.nameEn,
    nameZh: kit.nameZh,
    slug: kit.slug,
    description: kit.description ?? null,
    descriptionEn: kit.descriptionEn ?? null,
    descriptionZh: kit.descriptionZh ?? null,
    discountPercent: kit.discountPercent?.toString() ?? null,
    isActive: kit.isActive,
    cmsData: kit.cmsData ?? {},
    items: kit.items.map((i) => ({
      equipmentId: i.equipmentId,
      quantity: i.quantity,
      equipment: { ...i.equipment, dailyPrice: i.equipment.dailyPrice.toString() },
    })),
    totalDailyRate: sumDaily,
    finalDailyRate: finalDaily,
    createdAt: kit.createdAt.toISOString(),
    updatedAt: kit.updatedAt.toISOString(),
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params

    const kit = await prisma.kit.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: {
            equipment: { select: { id: true, sku: true, model: true, dailyPrice: true } },
          },
        },
      },
    })
    if (!kit) throw new NotFoundError('Kit', id)
    return NextResponse.json(shapeKit(kit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.KIT_UPDATE))) {
      throw new ForbiddenError('You do not have permission to update kits')
    }
    const { id } = await params
    const existing = await prisma.kit.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Kit', id)

    const body = await request.json()
    const parsed = updateKitSchema.parse(body)

    const kit = await prisma.$transaction(async (tx) => {
      await tx.kit.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined && { name: parsed.name }),
          ...(parsed.nameEn !== undefined && { nameEn: parsed.nameEn }),
          ...(parsed.nameZh !== undefined && { nameZh: parsed.nameZh }),
          ...(parsed.slug !== undefined && { slug: parsed.slug }),
          ...(parsed.description !== undefined && { description: parsed.description }),
          ...(parsed.descriptionEn !== undefined && { descriptionEn: parsed.descriptionEn }),
          ...(parsed.descriptionZh !== undefined && { descriptionZh: parsed.descriptionZh }),
          ...(parsed.discountPercent != null && {
            discountPercent: new Decimal(parsed.discountPercent),
          }),
          ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
          ...(parsed.cmsData !== undefined && { cmsData: parsed.cmsData }),
          updatedBy: session.user!.id,
        },
      })
      if (parsed.items !== undefined) {
        await tx.kitEquipment.deleteMany({ where: { kitId: id } })
        await tx.kitEquipment.createMany({
          data: parsed.items.map((item) => ({
            kitId: id,
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        })
      }
      return tx.kit.findUniqueOrThrow({
        where: { id },
        include: {
          items: {
            include: {
              equipment: { select: { id: true, sku: true, model: true, dailyPrice: true } },
            },
          },
        },
      })
    })

    return NextResponse.json(shapeKit(kit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.KIT_DELETE))) {
      throw new ForbiddenError('You do not have permission to delete kits')
    }
    const { id } = await params
    const existing = await prisma.kit.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Kit', id)

    await prisma.kit.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
