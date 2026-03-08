/**
 * GET /api/admin/blog/analytics - Blog analytics for admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const days = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10), 7),
      90
    )

    const data = await BlogService.getAnalytics(days)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/blog/analytics]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
