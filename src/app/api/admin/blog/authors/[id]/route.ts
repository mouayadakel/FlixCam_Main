/**
 * GET    – get author by ID
 * PUT    – update author
 * DELETE – delete author (soft, optional reassign posts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'
import { updateAuthorSchema } from '@/lib/validators/blog.validator'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

async function requireBlogAdmin(): Promise<NextResponse | { userId: string }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 })
  }
  return { userId }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params
    const author = await BlogService.getAuthorById(id)
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }
    return NextResponse.json(author)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateAuthorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const author = await BlogService.updateAuthor(id, parsed.data, userId)
    return NextResponse.json(author)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBlogAdmin()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const reassignTo = searchParams.get('reassignTo') ?? undefined
    await BlogService.deleteAuthor(id, userId, reassignTo || null)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
