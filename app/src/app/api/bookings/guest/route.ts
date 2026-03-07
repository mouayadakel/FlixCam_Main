/**
 * @file api/bookings/guest/route.ts
 * @description GET endpoint for guest booking lookup by token.
 * Public, rate-limited. Returns customer-safe booking summary.
 * @module app/api/bookings/guest
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitUpstash(request, 'public')
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      )
    }

    const token = request.nextUrl.searchParams.get('token')
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return Response.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findFirst({
      where: {
        guestToken: token.trim(),
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        vatAmount: true,
        depositAmount: true,
        guestName: true,
        guestEmail: true,
        equipment: {
          where: { deletedAt: null },
          select: {
            quantity: true,
            equipment: {
              select: {
                model: true,
                sku: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    })

    if (!booking) {
      return Response.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    const data = {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: Number(booking.totalAmount),
      vatAmount: Number(booking.vatAmount),
      depositAmount: booking.depositAmount ? Number(booking.depositAmount) : null,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      equipment: booking.equipment.map((be) => ({
        model: be.equipment.model,
        sku: be.equipment.sku,
        quantity: be.quantity,
      })),
      paymentStatus: booking.payments[0]?.status ?? 'PENDING',
    }

    return Response.json({ success: true, data })
  } catch (error) {
    logger.error('Guest booking lookup failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
