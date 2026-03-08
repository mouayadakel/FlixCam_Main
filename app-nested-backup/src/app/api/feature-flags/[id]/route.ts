/**
 * @file route.ts
 * @description Feature flag by ID API endpoint
 * @module app/api/feature-flags/[id]
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const flag = await FeatureFlagService.update(id, {
      ...body,
      userId: session.user.id,
    })

    // Cache invalidation: Set cache-control headers to prevent caching
    // In production, you might want to use Redis cache invalidation here
    const response = NextResponse.json({ flag })
    response.headers.set('Cache-Control', 'no-store, must-revalidate')

    return response
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update feature flag' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await FeatureFlagService.delete(id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete feature flag' },
      { status: 500 }
    )
  }
}
