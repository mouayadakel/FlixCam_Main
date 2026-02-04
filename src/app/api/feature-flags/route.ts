/**
 * @file route.ts
 * @description Feature flags API endpoint
 * @module app/api/feature-flags
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const flags = await FeatureFlagService.getAll()

    return NextResponse.json({ flags })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feature flags' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const flag = await FeatureFlagService.create({
      ...body,
      userId: session.user.id,
    })

    return NextResponse.json({ flag }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create feature flag' },
      { status: 500 }
    )
  }
}
