/**
 * GET – return preview URL for a post slug (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getBlogPreviewUrl } from '@/lib/utils/blog-preview'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const url = getBlogPreviewUrl(slug.trim())
    if (!url) {
      return NextResponse.json(
        { error: 'Preview not configured (BLOG_PREVIEW_TOKEN missing)' },
        { status: 503 }
      )
    }

    return NextResponse.json({ url })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/admin/blog/preview-url]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
