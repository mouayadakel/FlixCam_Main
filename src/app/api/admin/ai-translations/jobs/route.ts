import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { listTranslationJobs } from '@/lib/services/ai-translations-admin.service'

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [canRead, canUpdate] = await Promise.all([
      hasPermission(userId, PERMISSIONS.SETTINGS_READ),
      hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE),
    ])
    if (!canRead && !canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ jobs: listTranslationJobs() })
  } catch (error) {
    console.error('Failed to list translation jobs:', error)
    return NextResponse.json({ error: 'Failed to load translation jobs' }, { status: 500 })
  }
}
