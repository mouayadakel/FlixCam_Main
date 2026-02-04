/**
 * @file route.ts
 * @description Integrations API endpoint
 * @module app/api/integrations
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration.service'
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

    const integrations = await IntegrationService.getAll()

    return NextResponse.json({ integrations })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}
