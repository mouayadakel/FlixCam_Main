import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { syncActiveNewsletterSubscribers } from '@/lib/services/mailchimp.service'

const syncSchema = z.object({
  limit: z.number().int().min(1).max(5000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawBody: unknown = await request.json().catch(() => ({}))
    const parsed = syncSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const summary = await syncActiveNewsletterSubscribers(parsed.data.limit)
    return NextResponse.json({
      ok: true,
      ...summary,
      synced: summary.added + summary.updated,
    })
  } catch (error) {
    console.error('Mailchimp sync failed:', error)
    return NextResponse.json({ error: 'Failed to sync subscribers' }, { status: 500 })
  }
}
