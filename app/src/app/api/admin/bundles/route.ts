/**
 * @file route.ts
 * @description Admin equipment bundle management (list + create)
 * @module app/api/admin/bundles
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { handleApiError } from '@/lib/utils/api-helpers'
import { logger } from '@/lib/logger'
import { Decimal } from '@prisma/client/runtime/library'

const createBundleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dailyRate: z.number().positive('Daily rate must be positive'),
  weeklyRate: z.number().positive().optional(),
  monthlyRate: z.number().positive().optional(),
  depositAmount: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        equipmentId: z.string().min(1, 'Equipment ID is required'),
        quantity: z.number().int().positive('Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item is required'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(session.user.id, 'kit.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit

    const [bundles, total] = await Promise.all([
      prisma.equipmentBundle.findMany({
        where: { deletedAt: null },
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
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.equipmentBundle.count({ where: { deletedAt: null } }),
    ])

    const data = bundles.map((bundle) => {
      const aLaCarteTotal = bundle.items.reduce((sum, item) => {
        const price = Number(item.equipment.dailyPrice)
        return sum + price * item.quantity
      }, 0)
      return {
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
      }
    })

    return NextResponse.json({ data, total })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canCreate = await hasPermission(session.user.id, 'kit.create' as never)
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createBundleSchema.parse(body)

    const equipmentIds = [...new Set(parsed.items.map((i) => i.equipmentId))]
    const existingEquipment = await prisma.equipment.findMany({
      where: { id: { in: equipmentIds }, deletedAt: null },
      select: { id: true },
    })
    const existingIds = new Set(existingEquipment.map((e) => e.id))
    const missingIds = equipmentIds.filter((id) => !existingIds.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Equipment not found: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    const bundle = await prisma.$transaction(async (tx) => {
      const created = await tx.equipmentBundle.create({
        data: {
          name: parsed.name,
          description: parsed.description ?? null,
          dailyRate: new Decimal(parsed.dailyRate),
          weeklyRate: parsed.weeklyRate != null ? new Decimal(parsed.weeklyRate) : null,
          monthlyRate: parsed.monthlyRate != null ? new Decimal(parsed.monthlyRate) : null,
          depositAmount:
            parsed.depositAmount != null ? new Decimal(parsed.depositAmount) : null,
        },
      })

      await tx.bundleItem.createMany({
        data: parsed.items.map((item) => ({
          bundleId: created.id,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        })),
      })

      return tx.equipmentBundle.findUnique({
        where: { id: created.id },
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

    logger.info('Bundle created', {
      bundleId: bundle?.id,
      name: parsed.name,
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
