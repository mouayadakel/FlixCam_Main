/**
 * @file route.ts
 * @description API for single delivery zone GET, PATCH, DELETE
 * @module app/api/delivery-zones/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const zone = await prisma.deliveryZone.findUnique({ where: { id } })
    if (!zone) return NextResponse.json({ error: 'Delivery zone not found' }, { status: 404 })

    return NextResponse.json({
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
    })
  } catch (e) {
    console.error('Delivery zone get error:', e)
    return NextResponse.json({ error: 'Failed to load zone' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, nameAr, baseFee, perKmFee, minOrder, leadTimeHrs, isActive, cities } = body

    const data: Record<string, unknown> = {}
    if (typeof name === 'string') data.name = name.trim()
    if (nameAr !== undefined)
      data.nameAr = typeof nameAr === 'string' ? nameAr.trim() || null : null
    if (baseFee !== undefined)
      data.baseFee = typeof baseFee === 'number' ? baseFee : parseFloat(baseFee)
    if (perKmFee !== undefined)
      data.perKmFee =
        typeof perKmFee === 'number' ? perKmFee : perKmFee == null ? null : parseFloat(perKmFee)
    if (minOrder !== undefined)
      data.minOrder =
        typeof minOrder === 'number' ? minOrder : minOrder == null ? null : parseFloat(minOrder)
    if (leadTimeHrs !== undefined)
      data.leadTimeHrs = typeof leadTimeHrs === 'number' ? leadTimeHrs : parseInt(leadTimeHrs, 10)
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (Array.isArray(cities)) data.cities = cities

    const zone = await prisma.deliveryZone.update({ where: { id }, data: data as never })

    return NextResponse.json({
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
    })
  } catch (e) {
    console.error('Delivery zone update error:', e)
    return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.deliveryZone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delivery zone delete error:', e)
    return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500 })
  }
}
