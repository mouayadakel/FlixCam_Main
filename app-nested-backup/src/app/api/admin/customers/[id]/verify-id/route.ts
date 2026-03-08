/**
 * @file route.ts
 * @description Admin endpoint to approve/reject customer ID verification
 * @module app/api/admin/customers/[id]/verify-id
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { AuditService } from '@/lib/services/audit.service'
import { NotificationService } from '@/lib/services/notification.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'

const verifyIdSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, 'client.update' as never)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: customerId } = await params
    const body = await request.json()
    const parsed = verifyIdSchema.parse(body)

    if (parsed.action === 'reject' && !parsed.rejectionReason?.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        idVerificationStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (user.idVerificationStatus !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: 'Customer ID is not pending review' },
        { status: 400 }
      )
    }

    if (parsed.action === 'approve') {
      await prisma.user.update({
        where: { id: customerId },
        data: {
          idVerificationStatus: 'VERIFIED',
          idVerifiedAt: new Date(),
          idVerifiedBy: session.user.id,
          idRejectionReason: null,
        },
      })

      await NotificationService.send({
        userId: customerId,
        channel: NotificationChannel.IN_APP,
        type: 'id_verification.approved',
        title: 'ID Verification Approved',
        message: 'Your ID has been verified successfully. You can now proceed with bookings.',
      })
    } else {
      await prisma.user.update({
        where: { id: customerId },
        data: {
          idVerificationStatus: 'REJECTED',
          idRejectionReason: parsed.rejectionReason ?? 'No reason provided',
          idVerifiedAt: null,
          idVerifiedBy: null,
        },
      })

      await NotificationService.send({
        userId: customerId,
        channel: NotificationChannel.IN_APP,
        type: 'id_verification.rejected',
        title: 'ID Verification Rejected',
        message:
          parsed.rejectionReason ??
          'Your ID verification was rejected. Please contact support for more information.',
      })
    }

    await AuditService.log({
      action: `id_verification.${parsed.action}`,
      userId: session.user.id,
      resourceType: 'User',
      resourceId: customerId,
      metadata: {
        customerId,
        action: parsed.action,
        rejectionReason: parsed.rejectionReason,
      },
    })

    logger.info('ID verification processed', {
      customerId,
      action: parsed.action,
      adminId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
