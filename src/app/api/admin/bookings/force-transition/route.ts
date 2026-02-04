/**
 * @file route.ts
 * @description Force booking state transition endpoint
 * @module app/api/admin/bookings/force-transition
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { UserRole, BookingStatus } from '@prisma/client'

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
    const { bookingId, newStatus, reason } = body

    if (!bookingId || !newStatus || !reason) {
      return NextResponse.json(
        { error: 'Booking ID, new status, and reason are required' },
        { status: 400 }
      )
    }

    // Validate status
    if (!Object.values(BookingStatus).includes(newStatus as BookingStatus)) {
      return NextResponse.json(
        { error: 'Invalid booking status' },
        { status: 400 }
      )
    }

    // Force transition (bypass normal state machine)
    // This is a special admin function
    const booking = await BookingService.getById(bookingId, session.user.id)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update booking status directly (bypass service validation)
    const { prisma } = await import('@/lib/db/prisma')
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus as BookingStatus,
        updatedBy: session.user.id,
      },
    })

    await AuditService.log({
      action: 'admin.booking.force_transition',
      userId: session.user.id,
      resourceType: 'booking',
      resourceId: bookingId,
      metadata: {
        from: booking.status,
        to: newStatus,
        reason,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'State transition forced successfully',
      booking: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to force state transition' },
      { status: 500 }
    )
  }
}
