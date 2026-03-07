/**
 * @file route.ts
 * @description API for delivery zones CRUD
 * @module app/api/delivery-zones
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const zones = await prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } })
    const data = zones.map((z) => ({
      id: z.id,
      name: z.name,
      nameAr: z.nameAr,
      baseFee: Number(z.baseFee),
      perKmFee: z.perKmFee != null ? Number(z.perKmFee) : null,
      minOrder: z.minOrder != null ? Number(z.minOrder) : null,
      leadTimeHrs: z.leadTimeHrs,
      isActive: z.isActive,
      cities: z.cities,
      createdAt: z.createdAt.toISOString(),
      updatedAt: z.updatedAt.toISOString(),
    }))
    return NextResponse.json({ data })
  } catch (e) {
    console.error('Delivery zones list error:', e)
    return NextResponse.json({ error: 'Failed to load delivery zones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, nameAr, baseFee, perKmFee, minOrder, leadTimeHrs, isActive, cities } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const baseFeeNum = typeof baseFee === 'number' ? baseFee : parseFloat(baseFee)
    if (Number.isNaN(baseFeeNum) || baseFeeNum < 0) {
      return NextResponse.json({ error: 'baseFee must be a non-negative number' }, { status: 400 })
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        name: name.trim(),
        nameAr: typeof nameAr === 'string' ? nameAr.trim() || null : null,
        baseFee: baseFeeNum,
        perKmFee:
          typeof perKmFee === 'number' ? perKmFee : perKmFee != null ? parseFloat(perKmFee) : null,
        minOrder:
          typeof minOrder === 'number' ? minOrder : minOrder != null ? parseFloat(minOrder) : null,
        leadTimeHrs:
          typeof leadTimeHrs === 'number' ? leadTimeHrs : parseInt(leadTimeHrs, 10) || 24,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        cities: Array.isArray(cities) ? cities : [],
      },
    })

    return NextResponse.json(
      {
        id: zone.id,
        name: zone.name,
        nameAr: zone.nameAr,
        baseFee: Number(zone.baseFee),
        perKmFee: zone.perKmFee != null ? Number(zone.perKmFee) : null,
        minOrder: zone.minOrder != null ? Number(zone.minOrder) : null,
        leadTimeHrs: zone.leadTimeHrs,
        isActive: zone.isActive,
        cities: zone.cities,
        createdAt: zone.createdAt.toISOString(),
        updatedAt: zone.updatedAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Delivery zone create error:', e)
    return NextResponse.json({ error: 'Failed to create delivery zone' }, { status: 500 })
  }
}
