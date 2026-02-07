/**
 * @file route.ts
 * @description User detail API endpoints
 * @module app/api/admin/users/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum([
    'ADMIN',
    'SALES_MANAGER',
    'ACCOUNTANT',
    'WAREHOUSE_MANAGER',
    'TECHNICIAN',
    'CUSTOMER_SERVICE',
    'MARKETING_MANAGER',
    'RISK_MANAGER',
    'APPROVAL_AGENT',
    'AUDITOR',
    'AI_OPERATOR',
    'DATA_ENTRY',
  ]).optional(),
  phone: z.string().optional(),
  twoFactorEnabled: z.boolean().optional(),
})

/**
 * GET /api/admin/users/[id]
 * Get user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimit = rateLimitAPI(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const canView = await hasPermission(session.user.id, PERMISSIONS.USER_READ)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.read permission' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        deletedAt: true,
      },
    })

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get custom permissions separately
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        permission: true,
      },
    })

    const customPermissions = userPermissions.map((up: any) => ({
      id: up.permission.id,
      name: up.permission.name,
      description: up.permission.description,
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        customPermissions,
      },
    })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimit = rateLimitAPI(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.USER_UPDATE)
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.update permission' },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser || existingUser.deletedAt) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If changing role, check role assignment permission
    if (validatedData.role && validatedData.role !== existingUser.role) {
      const canAssignRole = await hasPermission(session.user.id, PERMISSIONS.USER_ASSIGN_ROLE)
      if (!canAssignRole) {
        return NextResponse.json(
          { error: 'Forbidden - Missing user.assign_role permission' },
          { status: 403 }
        )
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...validatedData,
        role: validatedData.role as any,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'user.updated',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        changes: validatedData,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete (soft delete) a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimit = rateLimitAPI(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const canDelete = await hasPermission(session.user.id, PERMISSIONS.USER_DELETE)
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.delete permission' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!existingUser || existingUser.deletedAt) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'user.deleted',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        email: existingUser.email,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
