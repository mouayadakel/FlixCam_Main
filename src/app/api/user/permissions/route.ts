/**
 * @file route.ts
 * @description User permissions API endpoint
 * @module app/api/user/permissions
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPermissions } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

// Force dynamic rendering for this API route
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
        { permissions: [] },
        { status: 200 }
      )
    }

    const permissions = await getUserPermissions(session.user.id)

    return NextResponse.json(
      { permissions },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    )
  } catch (error: any) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching permissions:', error)
    }
    // Return empty permissions array instead of error to prevent UI breakage
    return NextResponse.json(
      { permissions: [] },
      { status: 200 }
    )
  }
}
