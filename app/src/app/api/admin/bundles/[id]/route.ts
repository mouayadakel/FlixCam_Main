/**
 * @file route.ts
 * @description Admin single bundle management (get, update, soft delete)
 * @module app/api/admin/bundles/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { handleApiError } from '@/lib/utils/api-helpers'
import { logger } from '@/lib/logger'
import { Decimal } from '@prisma/client/runtime/library'

const updateBundleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dailyRate: z.number().positive().optional(),
  weeklyRate: z.number().positive().optional().nullable(),
  monthlyRate: z.number().positive().optional().nullable(),
  depositAmount: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  items: z
    .array(
      z.object({
        equipmentId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(session.user.id, 'kit.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const bundle = await prisma.equipmentBundle.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: {
            equipment: {
              select: {
                id: true,
                nameEn: true,
                model: true,
                sku: true,
                dailyPrice: true,
              },
            },
          },
        },
      },
    })

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const aLaCarteTotal = bundle.items.reduce((sum, item) => {
      const price = Number(item.equipment.dailyPrice)
      return sum + price * item.quantity
    }, 0)

    return NextResponse.json({
      ...bundle,
      dailyRate: Number(bundle.dailyRate),
      weeklyRate: bundle.weeklyRate ? Number(bundle.weeklyRate) : null,
      monthlyRate: bundle.monthlyRate ? Number(bundle.monthlyRate) : null,
      depositAmount: bundle.depositAmount ? Number(bundle.depositAmount) : null,
      aLaCarteTotal: Math.round(aLaCarteTotal * 100) / 100,
      items: bundle.items.map((i) => ({
        ...i,
        equipment: {
          ...i.equipment,
          dailyPrice: Number(i.equipment.dailyPrice),
        },
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, 'kit.update' as never)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.equipmentBundle.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateBundleSchema.parse(body)

    if (parsed.items) {
      const equipmentIds = [...new Set(parsed.items.map((i) => i.equipmentId))]
      const existingEquipment = await prisma.equipment.findMany({
        where: { id: { in: equipmentIds }, deletedAt: null },
        select: { id: true },
      })
      const existingIds = new Set(existingEquipment.map((e) => e.id))
      const missingIds = equipmentIds.filter((eid) => !existingIds.has(eid))
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Equipment not found: ${missingIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const bundle = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {}
      if (parsed.name != null) updateData.name = parsed.name
      if (parsed.description !== undefined) updateData.description = parsed.description
      if (parsed.dailyRate != null) updateData.dailyRate = new Decimal(parsed.dailyRate)
      if (parsed.weeklyRate !== undefined)
        updateData.weeklyRate = parsed.weeklyRate != null ? new Decimal(parsed.weeklyRate) : null
      if (parsed.monthlyRate !== undefined)
        updateData.monthlyRate =
          parsed.monthlyRate != null ? new Decimal(parsed.monthlyRate) : null
      if (parsed.depositAmount !== undefined)
        updateData.depositAmount =
          parsed.depositAmount != null ? new Decimal(parsed.depositAmount) : null
      if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive

      if (Object.keys(updateData).length > 0) {
        await tx.equipmentBundle.update({
          where: { id },
          data: updateData,
        })
      }

      if (parsed.items) {
        await tx.bundleItem.deleteMany({ where: { bundleId: id } })
        await tx.bundleItem.createMany({
          data: parsed.items.map((item) => ({
            bundleId: id,
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        })
      }

      return tx.equipmentBundle.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              equipment: {
                select: {
                  id: true,
                  nameEn: true,
                  model: true,
                  sku: true,
                  dailyPrice: true,
                },
              },
            },
          },
        },
      })
    })

    logger.info('Bundle updated', {
      bundleId: id,
      adminId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...bundle,
        dailyRate: bundle ? Number(bundle.dailyRate) : null,
        weeklyRate: bundle?.weeklyRate ? Number(bundle.weeklyRate) : null,
        monthlyRate: bundle?.monthlyRate ? Number(bundle.monthlyRate) : null,
        depositAmount: bundle?.depositAmount ? Number(bundle.depositAmount) : null,
        items: bundle?.items.map((i) => ({
          ...i,
          equipment: i.equipment
            ? {
                ...i.equipment,
                dailyPrice: Number(i.equipment.dailyPrice),
              }
            : null,
        })),
      },
    })
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, 'kit.delete' as never)
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.equipmentBundle.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    await prisma.equipmentBundle.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    logger.info('Bundle soft deleted', {
      bundleId: id,
      adminId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
