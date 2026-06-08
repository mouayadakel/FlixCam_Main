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

    const contract = await prisma.contract.findFirst({
      where: { bookingId },
      include: {
        booking: { select: { bookingNumber: true, customerId: true } },
      },
    })

    if (!contract || !contract.booking) {
      return NextResponse.json({ error: 'Contract or Booking not found' }, { status: 404 })
    }

    if (contract.booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!contract.contractContent) {
      return NextResponse.json(
        { error: 'No contract content available for this booking' },
        { status: 400 }
      )
    }

    if (contract.signedAt) {
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
      prisma.contract.update({
        where: { id: contract.id },
        data: {
          signedAt: new Date(),
          signedBy: session.user.id,
          signatureData: { ip: clientIp },
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
            bookingNumber: contract.booking.bookingNumber,
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
