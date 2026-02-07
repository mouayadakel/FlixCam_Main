/**
 * @file route.ts
 * @description Filtered menu for current user (by permissions)
 * @module app/api/user/menu
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserMenu } from '@/lib/auth/menu-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/menu - Menu tree filtered by user permissions
 */
export async function GET(request: NextRequest) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ menu: [] })
    }

    const menu = await getUserMenu(session.user.id)

    return NextResponse.json(
      { menu },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching menu:', error)
    }
    return NextResponse.json({ menu: [] })
  }
}
