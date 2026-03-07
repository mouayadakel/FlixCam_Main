/**
 * @file route.ts
 * @description API endpoint for AI settings management
 * @module app/api/admin/settings/ai
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { encrypt, decrypt, isEncrypted } from '@/lib/utils/encryption'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/ai
 * Retrieve AI settings
 */
export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - settings.update required' }, { status: 403 })
  }

  try {
    const settings = await prisma.aISettings.findMany({
      orderBy: { provider: 'asc' },
    })

    // Decrypt API keys and show only last 4 characters
    const sanitized = settings.map((s) => {
      let lastFour = ''
      if (s.apiKey) {
        try {
          const plainKey = isEncrypted(s.apiKey) ? decrypt(s.apiKey) : s.apiKey
          lastFour = plainKey.slice(-4)
        } catch {
          lastFour = s.apiKey.slice(-4)
        }
      }
      return {
        ...s,
        apiKey: s.apiKey ? `****${lastFour}` : null,
      }
    })

    return NextResponse.json({ settings: sanitized })
  } catch (error: any) {
    console.error('Failed to fetch AI settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings/ai
 * Update AI settings
 */
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - settings.update required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      provider,
      apiKey,
      batchSize,
      timeout,
      fallbackStrategy,
      enabled,
      dailyBudgetUsd,
      monthlyBudgetUsd,
    } = body as {
      provider: 'openai' | 'gemini'
      apiKey?: string
      batchSize?: number
      timeout?: number
      fallbackStrategy?: string
      enabled?: boolean
      dailyBudgetUsd?: number | null
      monthlyBudgetUsd?: number | null
    }

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    // Validate API key if provided (basic check)
    if (apiKey && apiKey.length < 10) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
    }

    // Encrypt the API key before storing
    const encryptedApiKey = apiKey ? encrypt(apiKey) : undefined

    // Update or create settings
    const settings = await prisma.aISettings.upsert({
      where: { provider },
      create: {
        provider,
        apiKey: encryptedApiKey || '',
        batchSize: batchSize || 50,
        timeout: timeout || 30000,
        fallbackStrategy: fallbackStrategy || 'mark_for_review',
        enabled: enabled !== undefined ? enabled : true,
      },
      update: {
        ...(encryptedApiKey && { apiKey: encryptedApiKey }),
        ...(batchSize !== undefined && { batchSize }),
        ...(timeout !== undefined && { timeout }),
        ...(fallbackStrategy !== undefined && { fallbackStrategy }),
        ...(enabled !== undefined && { enabled }),
        ...(dailyBudgetUsd !== undefined && {
          dailyBudgetUsd: dailyBudgetUsd == null ? null : dailyBudgetUsd,
        }),
        ...(monthlyBudgetUsd !== undefined && {
          monthlyBudgetUsd: monthlyBudgetUsd == null ? null : monthlyBudgetUsd,
        }),
      },
    })

    // Don't expose full API key
    const sanitized = {
      ...settings,
      apiKey: settings.apiKey ? `****${settings.apiKey.slice(-4)}` : null,
    }

    return NextResponse.json({ settings: sanitized })
  } catch (error: any) {
    console.error('Failed to update AI settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update AI settings' },
      { status: 500 }
    )
  }
}
