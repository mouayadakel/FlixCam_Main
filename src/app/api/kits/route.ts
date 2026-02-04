/**
 * @file route.ts
 * @description Equipment kits (bundles) – list and create
 * @module app/api/kits
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createKitSchema } from '@/lib/validators/kit.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = { deletedAt: null }
    if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true'

    const kits = await prisma.kit.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        items: {
          include: {
            equipment: {
              select: { id: true, sku: true, model: true, dailyPrice: true },
            },
          },
        },
      },
    })

    const shape = kits.map((kit) => {
      let sumDaily = 0
      kit.items.forEach((i) => {
        sumDaily += Number(i.equipment.dailyPrice ?? 0) * i.quantity
      })
      const discount = Number(kit.discountPercent ?? 0) / 100
      const finalDaily = sumDaily * (1 - discount)
      return {
        id: kit.id,
        name: kit.name,
        slug: kit.slug,
        description: kit.description ?? null,
        discountPercent: kit.discountPercent?.toString() ?? null,
        isActive: kit.isActive,
        items: kit.items.map((i) => ({
          equipmentId: i.equipmentId,
          quantity: i.quantity,
          equipment: i.equipment,
          dailyPrice: i.equipment.dailyPrice.toString(),
        })),
        totalDailyRate: sumDaily,
        finalDailyRate: finalDaily,
        createdAt: kit.createdAt.toISOString(),
        updatedAt: kit.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ kits: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createKitSchema.parse(body)

    const kit = await prisma.$transaction(async (tx) => {
      const created = await tx.kit.create({
        data: {
          name: parsed.name,
          slug: parsed.slug,
          description: parsed.description ?? null,
          discountPercent: parsed.discountPercent != null ? new Decimal(parsed.discountPercent) : null,
          isActive: parsed.isActive ?? true,
          createdBy: session.user!.id,
        },
      })
      await tx.kitEquipment.createMany({
        data: parsed.items.map((item) => ({
          kitId: created.id,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      })
      return tx.kit.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: {
            include: {
              equipment: { select: { id: true, sku: true, model: true, dailyPrice: true } },
            },
          },
        },
      })
    })

    let sumDaily = 0
    kit.items.forEach((i) => {
      sumDaily += Number(i.equipment.dailyPrice ?? 0) * i.quantity
    })
    const discount = Number(kit.discountPercent ?? 0) / 100
    const finalDaily = sumDaily * (1 - discount)

    return NextResponse.json({
      kit: {
        id: kit.id,
        name: kit.name,
        slug: kit.slug,
        description: kit.description ?? null,
        discountPercent: kit.discountPercent?.toString() ?? null,
        isActive: kit.isActive,
        items: kit.items.map((i) => ({
          equipmentId: i.equipmentId,
          quantity: i.quantity,
          equipment: i.equipment,
          dailyPrice: i.equipment.dailyPrice.toString(),
        })),
        totalDailyRate: sumDaily,
        finalDailyRate: finalDaily,
        createdAt: kit.createdAt.toISOString(),
        updatedAt: kit.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
