/**
 * @file route.ts
 * @description User permissions API endpoint
 * @module app/api/user/permissions
 *
 * Semantics (fail-closed, observable):
 * - ok: true + permissions when success
 * - ok: false, reason: "NO_SESSION" when no session (200, so UI can show login)
 * - ok: false, reason: "NO_PERMISSION" when user has no roles/permissions (200)
 * - ok: false, reason: "SERVER_ERROR" + 500 when backend fails (monitoring gets real 500)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPermissions } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

/**
 * Check if user is Super Admin (DB is source of truth; session.role is optional hint).
 * Rules (ROLES_AND_SECURITY.md): admin = full system access. Super admin = RBAC role or User.role ADMIN.
 */
async function isSuperAdminUser(userId: string, sessionRole?: string): Promise<boolean> {
  const roleLower = sessionRole?.toLowerCase()
  if (roleLower === 'super_admin') return true
  if (roleLower === 'admin') return true

  const [user, assignedSuperAdmin] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
    prisma.assignedUserRole.findFirst({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        role: { name: 'super_admin' },
      },
    }),
  ])

  if (assignedSuperAdmin) return true
  if (user?.role === 'ADMIN') return true
  return false
}

export async function GET(request: Request) {
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
        { ok: false, reason: 'NO_SESSION', permissions: [], isSuperAdmin: false },
        { status: 200 }
      )
    }

    const superAdmin = await isSuperAdminUser(session.user.id, session.user.role as string | undefined)
    const basePermissions = await getUserPermissions(session.user.id)
    const permissions = superAdmin ? ['*'] : basePermissions
    const isSuperAdmin = superAdmin || basePermissions.includes('*')

    return NextResponse.json(
      { ok: true, permissions, isSuperAdmin },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching permissions:', error)
    }
    return NextResponse.json(
      { ok: false, reason: 'SERVER_ERROR', permissions: [], isSuperAdmin: false },
      { status: 500 }
    )
  }
}
