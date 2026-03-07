/**
 * @file route.ts
 * @description POST endpoint for electronically signing a rental contract
 * @module app/api/contracts/[bookingId]/sign
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ bookingId: string }>
}

/**
 * POST /api/contracts/[bookingId]/sign
 * Signs a contract by recording timestamp and client IP.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await params
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        contractHtml: true,
        contractSignedAt: true,
        bookingNumber: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!booking.contractHtml) {
      return NextResponse.json(
        { error: 'No contract available for this booking' },
        { status: 400 }
      )
    }

    if (booking.contractSignedAt) {
      return NextResponse.json(
        { error: 'Contract has already been signed' },
        { status: 409 }
      )
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          contractSignedAt: new Date(),
          contractSignedIp: clientIp,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'contract.signed',
          userId: session.user.id,
          resourceType: 'Booking',
          resourceId: bookingId,
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            bookingNumber: booking.bookingNumber,
          },
        },
      }),
    ])

    logger.info('Contract signed', {
      bookingId,
      userId: session.user.id,
      ip: clientIp,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Contract sign failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
