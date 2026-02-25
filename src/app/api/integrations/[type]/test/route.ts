/**
 * @file route.ts
 * @description Test integration connection endpoint
 * @module app/api/integrations/[type]/test
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { IntegrationService } from '@/lib/services/integration.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await params
    const result = await IntegrationService.testConnection(type as any)

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    )
  }
}
