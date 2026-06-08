/**
 * @file route.ts
 * @description API route for delivery status and location updates
 * @module app/api/delivery/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { DeliveryService, DeliveryStatus } from '@/lib/services/delivery.service'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status, lat, lng, driverId } = body as {
      status?: DeliveryStatus
      lat?: number
      lng?: number
      driverId?: string | null
    }

    if (!status && driverId === undefined && (lat === undefined || lng === undefined)) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    let result
    const delivery = await prisma.delivery.findFirst({ where: { id, deletedAt: null } })
    if (!delivery) return NextResponse.json({ error: 'التوصيل غير موجود' }, { status: 404 })

    if (lat !== undefined && lng !== undefined) {
      result = await DeliveryService.updateDriverLocation(id, lat, lng, session.user.id)
    } else if (driverId !== undefined || status) {
      result = await DeliveryService.updateDelivery(
        delivery.bookingId,
        {
          deliveryId: id,
          ...(driverId !== undefined ? { driverId: driverId ?? undefined } : {}),
          ...(status ? { status } : {}),
        },
        session.user.id
      )
    }

    return NextResponse.json({ success: true, delivery: result })
  } catch (error) {
    console.error('Delivery update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث التوصيل' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const trackingInfo = await DeliveryService.getTrackingInfo(id)
    return NextResponse.json(trackingInfo)
  } catch (error) {
    console.error('Tracking info error:', error)
    return NextResponse.json(
      { error: 'التوصيل غير موجود أو غير متوفر حالياً' },
      { status: 404 }
    )
  }
}
