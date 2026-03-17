/**
 * @file route.ts
 * @description Restore (reactivate) a deactivated user – POST /api/admin/users/[id]/restore
 * @module app/api/admin/users/[id]/restore
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/[id]/restore
 * Restore a soft-deleted (deactivated) user.
 */
export async function POST(
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

    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.USER_UPDATE)
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.update permission' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!existingUser.deletedAt) {
      return NextResponse.json(
        { error: 'User is not deactivated' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    })

    await AuditService.log({
      action: 'user.restored',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error: unknown) {
    console.error('Error restoring user:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
