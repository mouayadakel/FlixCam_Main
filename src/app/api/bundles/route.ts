/**
 * @file route.ts
 * @description Public bundle listing (no auth required)
 * @module app/api/bundles
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit

    const [bundles, total] = await Promise.all([
      prisma.equipmentBundle.findMany({
        where: { isActive: true, deletedAt: null },
        include: {
          items: {
            include: {
              equipment: {
                select: {
                  id: true,
                  model: true,
                  sku: true,
                  dailyPrice: true,
                  media: {
                    where: { deletedAt: null },
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                    select: { url: true, altText: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.equipmentBundle.count({
        where: { isActive: true, deletedAt: null },
      }),
    ])

    const data = bundles.map((bundle) => ({
      ...bundle,
      dailyRate: Number(bundle.dailyRate),
      weeklyRate: bundle.weeklyRate ? Number(bundle.weeklyRate) : null,
      monthlyRate: bundle.monthlyRate ? Number(bundle.monthlyRate) : null,
      depositAmount: bundle.depositAmount ? Number(bundle.depositAmount) : null,
      items: bundle.items.map((i) => ({
        id: i.id,
        equipmentId: i.equipmentId,
        quantity: i.quantity,
        equipment: i.equipment
          ? {
              id: i.equipment.id,
              model: i.equipment.model,
              sku: i.equipment.sku,
              dailyPrice: Number(i.equipment.dailyPrice),
              firstImage: i.equipment.media[0]
                ? {
                    url: i.equipment.media[0].url,
                    altText: i.equipment.media[0].altText,
                  }
                : null,
            }
          : null,
      })),
    }))

    return NextResponse.json({ data, total })
  } catch (error) {
    return handleApiError(error)
  }
}
