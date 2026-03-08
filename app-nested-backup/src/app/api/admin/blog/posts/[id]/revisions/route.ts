/**
 * GET – list revision history for a blog post (admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json(
        { error: 'Forbidden - settings.read required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const revisions = await BlogService.getRevisions(id)
    return NextResponse.json(revisions)
  } catch (error) {
    console.error('Blog revisions fetch failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch revisions' },
      { status: 500 }
    )
  }
}
