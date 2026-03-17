/**
 * @file route.ts
 * @description Permanent (hard) delete user – DELETE /api/admin/users/[id]/permanent
 * @module app/api/admin/users/[id]/permanent
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/users/[id]/permanent
 * Permanently delete a user (hard delete). Fails if user has blocking relations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = rateLimitAPI(request)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, PERMISSIONS.USER_DELETE)
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.delete permission' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Pre-check blocking relations
    const [bookingsCount, quotesCount, invoicesCount, vendorCount, reviewsCount, promissoryCount, damageClaimsCount, bookingRequestsCount] =
      await Promise.all([
        prisma.booking.count({
          where: {
            OR: [{ customerId: userId }, { createdBy: userId }],
          },
        }),
        prisma.quote.count({ where: { customerId: userId } }),
        prisma.invoice.count({ where: { customerId: userId } }),
        prisma.vendor.count({ where: { userId } }),
        prisma.review.count({ where: { userId } }),
        prisma.promissoryNote.count({ where: { debtorId: userId } }),
        prisma.damageClaim.count({
          where: {
            OR: [{ reportedBy: userId }, { resolvedBy: userId }],
          },
        }),
        prisma.bookingRequest.count({ where: { requestedBy: userId } }),
      ])

    const blockers: string[] = []
    if (bookingsCount > 0) blockers.push(`${bookingsCount} bookings`)
    if (quotesCount > 0) blockers.push(`${quotesCount} quotes`)
    if (invoicesCount > 0) blockers.push(`${invoicesCount} invoices`)
    if (vendorCount > 0) blockers.push('vendor account')
    if (reviewsCount > 0) blockers.push(`${reviewsCount} reviews`)
    if (promissoryCount > 0) blockers.push(`${promissoryCount} promissory notes`)
    if (damageClaimsCount > 0) blockers.push(`${damageClaimsCount} damage claims`)
    if (bookingRequestsCount > 0) blockers.push(`${bookingRequestsCount} booking requests`)

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot permanently delete: user has ${blockers.join(', ')}. Use Deactivate instead.`,
        },
        { status: 400 }
      )
    }

    // Transaction: clear references, then delete user
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } })
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } })
      await tx.event.updateMany({ where: { userId }, data: { userId: null } })
      await tx.user.delete({ where: { id: userId } })
    })

    await AuditService.log({
      action: 'user.hard_deleted',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: userId,
      metadata: { email: existingUser.email },
    })

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted',
    })
  } catch (error: unknown) {
    console.error('Error permanently deleting user:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
