/**
 * Marketing settings CRUD — DB overrides for tracking & business identity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import {
  ensureMarketingSettingsSeeded,
  MARKETING_SETTING_KEYS,
} from '@/lib/services/marketing-settings.service'

export const dynamic = 'force-dynamic'

const SECRET_KEYS = new Set([
  'mailchimp_api_key',
  'meta_capi_token',
])

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(userId, PERMISSIONS.MARKETING_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await ensureMarketingSettingsSeeded()
    const rows = await prisma.marketingSettings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
    const data = rows.map((r) => ({
      ...r,
      value: SECRET_KEYS.has(r.key) && r.value ? '••••••••' : r.value,
      masked: SECRET_KEYS.has(r.key) && Boolean(r.value),
    }))
    return NextResponse.json({ settings: data })
  } catch {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates = body.updates || [{ key: body.key, value: body.value ?? '' }]
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const canMarketing = await hasPermission(userId, PERMISSIONS.MARKETING_READ)
    const canSettings = await hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE)

    const processed = await prisma.$transaction(async (tx) => {
      const actualProcessed = []
      for (const update of updates) {
        const { key, value } = update
        if (!key || !MARKETING_SETTING_KEYS.includes(key as any)) continue
        
        const isSecret = SECRET_KEYS.has(key)
        if (isSecret && !canSettings) continue
        if (!isSecret && !canMarketing) continue
        
        if (isSecret && value === '••••••••') continue

        await tx.marketingSettings.update({
          where: { key },
          data: { value, updatedBy: userId },
        })
        actualProcessed.push(key)
      }
      return actualProcessed
    })
    
    // Invalidate public branding and other dependent caches
    try {
      revalidateTag('public-branding', 'max')
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, processed: processed.length })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
