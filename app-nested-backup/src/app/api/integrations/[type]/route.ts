/**
 * @file route.ts
 * @description Integration config save/update endpoint
 * @module app/api/integrations/[type]
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { IntegrationConfigService } from '@/lib/services/integration-config.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function PATCH(request: Request, { params }: { params: Promise<{ type: string }> }) {
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
    const body = await request.json()
    const { config, enabled } = body

    const saved = await IntegrationConfigService.saveConfig(
      type,
      config,
      enabled ?? true,
      session.user.id
    )

    return NextResponse.json({ config: saved })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save integration config' },
      { status: 500 }
    )
  }
}
