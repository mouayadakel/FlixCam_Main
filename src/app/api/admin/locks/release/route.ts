/**
 * @file route.ts
 * @description Release soft lock endpoint
 * @module app/api/admin/locks/release
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { UserRole } from '@prisma/client'

export async function POST(request: Request) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { lockId } = body

    if (!lockId) {
      return NextResponse.json(
        { error: 'Lock ID is required' },
        { status: 400 }
      )
    }

    // Release soft lock - lockId is a booking ID
    const { prisma } = await import('@/lib/db/prisma')
    const booking = await prisma.booking.findFirst({
      where: {
        id: lockId,
        deletedAt: null,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (!booking.softLockExpiresAt) {
      return NextResponse.json(
        { error: 'No active soft lock found for this booking' },
        { status: 400 }
      )
    }

    await prisma.booking.update({
      where: { id: lockId },
      data: {
        softLockExpiresAt: null,
        updatedBy: session.user.id,
      },
    })

    await AuditService.log({
      action: 'admin.lock.release',
      userId: session.user.id,
      resourceType: 'lock',
      resourceId: lockId,
      metadata: {
        lockId,
        bookingId: lockId,
        originalExpiry: booking.softLockExpiresAt?.toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Lock released successfully',
      lockId,
      bookingId: lockId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to release lock' },
      { status: 500 }
    )
  }
}
