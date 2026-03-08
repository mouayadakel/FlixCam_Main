/**
 * GET  – list all posts (admin, all statuses)
 * POST – create post
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'
import { createPostSchema } from '@/lib/validators/blog.validator'
import { searchParamsSchema } from '@/lib/validators/blog.validator'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function requireBlogAdmin() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
  if (!canRead) {
    return { error: NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 }) }
  }
  return { userId }
}

export async function GET(request: NextRequest) {
  const authResult = await requireBlogAdmin()
  if ('error' in authResult) return authResult.error

  try {
    const { searchParams } = new URL(request.url)
    const parsed = searchParamsSchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      sort: searchParams.get('sort') ?? 'newest',
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
    })
    const params = parsed.success ? parsed.data : { page: 1, limit: 20, sort: 'newest' as const }
    const result = await BlogService.getPostsForAdmin(params)
    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/admin/blog/posts]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireBlogAdmin()
  if ('error' in authResult) return authResult.error
  const { userId } = authResult

  try {
    const body = await request.json()
    if (!body.slug || (typeof body.slug === 'string' && body.slug.trim() === '')) {
      body.slug = slugify(body.titleEn || 'untitled')
    }
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const post = await BlogService.createPost(parsed.data, userId)
    return NextResponse.json(post)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/admin/blog/posts]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
