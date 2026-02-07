/**
 * @file route.ts
 * @description User management API endpoints
 * @module app/api/admin/users
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'
import { hashPassword } from '@/lib/auth/auth-helpers'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8).optional(),
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
  ]),
  phone: z.string().optional(),
})

/**
 * GET /api/admin/users
 * List all users with filtering
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const excludeRoleId = searchParams.get('excludeRoleId') // RBAC role ID - exclude users who have this role
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // Build where clause
    const where: any = {
      deletedAt: null,
    }

    if (role) {
      where.role = role
    }

    // Exclude users already assigned to this RBAC role (for assign-user-to-role flow)
    if (excludeRoleId) {
      where.NOT = {
        userRoles: {
          some: {
            roleId: excludeRoleId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      }
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: users,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
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
    const canCreate = await hasPermission(session.user.id, PERMISSIONS.USER_CREATE)
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.create permission' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Generate temporary password if not provided
    const password = validatedData.password || Math.random().toString(36).slice(-12)
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name || null,
        passwordHash,
        role: validatedData.role as any,
        phone: validatedData.phone || null,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    })

    // Audit log
    await AuditService.log({
      action: 'user.created',
      userId: session.user.id,
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
      meta: {
        temporaryPassword: validatedData.password ? undefined : password,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
