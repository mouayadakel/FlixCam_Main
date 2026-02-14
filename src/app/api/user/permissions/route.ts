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

export const dynamic = 'force-dynamic'

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

    const permissions = await getUserPermissions(session.user.id)
    const isSuperAdmin = permissions.includes('*')

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
