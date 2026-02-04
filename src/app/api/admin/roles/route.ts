/**
 * @file route.ts
 * @description Role management API endpoints
 * @module app/api/admin/roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getRoleDetails } from '@/lib/auth/role-details'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { AuditService } from '@/lib/services/audit.service'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

/**
 * GET /api/admin/roles
 * List all roles with user counts
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
    const canView = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing settings.manage_roles permission' },
        { status: 403 }
      )
    }

    // Get all roles from UserRole enum
    const roles = [
      { id: 'ADMIN', name: 'Admin', description: 'Full operational access' },
      { id: 'SALES_MANAGER', name: 'Sales Manager', description: 'Manage sales, bookings, quotes, clients' },
      { id: 'ACCOUNTANT', name: 'Accountant', description: 'Financial operations and reporting' },
      { id: 'WAREHOUSE_MANAGER', name: 'Warehouse Manager', description: 'Equipment and inventory management' },
      { id: 'TECHNICIAN', name: 'Technician', description: 'Equipment maintenance and inspection' },
      { id: 'CUSTOMER_SERVICE', name: 'Customer Service', description: 'Customer support and basic operations' },
      { id: 'MARKETING_MANAGER', name: 'Marketing Manager', description: 'Marketing campaigns and analytics' },
      { id: 'RISK_MANAGER', name: 'Risk Manager', description: 'Risk assessment and approvals' },
      { id: 'APPROVAL_AGENT', name: 'Approval Agent', description: 'Process approval requests' },
      { id: 'AUDITOR', name: 'Auditor', description: 'Read-only access for auditing' },
      { id: 'AI_OPERATOR', name: 'AI Operator', description: 'AI features and automation' },
      { id: 'DATA_ENTRY', name: 'Data Entry', description: 'Basic data entry access' },
    ]

    // Get user counts and permissions for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await prisma.user.count({
          where: {
            role: role.id as any,
            deletedAt: null,
          },
        })
        const details = getRoleDetails(role.id)
        return {
          ...role,
          userCount,
          permissions: details?.permissions ?? [],
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: rolesWithCounts,
    })
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles
 * Create a new custom role (future enhancement)
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
    const canCreate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Forbidden - Missing settings.manage_roles permission' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createRoleSchema.parse(body)

    // Note: Custom roles would require database schema changes
    // For now, we only support the predefined UserRole enum
    return NextResponse.json(
      { error: 'Custom roles not yet supported. Use predefined roles.' },
      { status: 400 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
