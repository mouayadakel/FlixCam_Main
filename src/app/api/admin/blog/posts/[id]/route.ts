/**
 * GET    – get post by ID (admin)
 * PUT    – update post
 * DELETE – soft delete post
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'
import { updatePostSchema } from '@/lib/validators/blog.validator'
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if ('error' in authResult) return authResult.error

  try {
    const { id } = await params
    const post = await BlogService.getPostById(id)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json(post)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GET /api/admin/blog/posts/[id]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if ('error' in authResult) return authResult.error
  const { userId } = authResult

  try {
    const { id } = await params
    const body = await request.json()
    if (body.slug === '' && body.titleEn) {
      body.slug = slugify(body.titleEn)
    }
    const parsed = updatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const post = await BlogService.updatePost(id, parsed.data, userId)
    return NextResponse.json(post)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/blog/posts/[id]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if ('error' in authResult) return authResult.error
  const { userId } = authResult

  try {
    const { id } = await params
    await BlogService.deletePost(id, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DELETE /api/admin/blog/posts/[id]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
