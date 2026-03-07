/**
 * GET /api/vendor/bookings - Bookings involving vendor's equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await prisma.vendor.findFirst({
      where: { userId: session.user.id, deletedAt: null, status: 'APPROVED' },
    })
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor account not found or not approved' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '20')

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: {
          equipment: {
            some: { equipment: { vendorId: vendor.id } },
          },
          deletedAt: null,
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          equipment: {
            where: { equipment: { vendorId: vendor.id } },
            include: {
              equipment: {
                select: { id: true, sku: true, model: true, dailyPrice: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.booking.count({
        where: {
          equipment: {
            some: { equipment: { vendorId: vendor.id } },
          },
          deletedAt: null,
        },
      }),
    ])

    return NextResponse.json({ items: bookings, total, skip, take })
  } catch (error) {
    return handleApiError(error)
  }
}
