/**
 * GET    – get category by ID
 * PUT    – update category
 * DELETE – delete category (soft, optional reassign posts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'
import { updateCategorySchema } from '@/lib/validators/blog.validator'
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
    const category = await BlogService.getCategoryById(id)
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json(category)
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
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const category = await BlogService.updateCategory(id, parsed.data, userId)
    return NextResponse.json(category)
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
    await BlogService.deleteCategory(id, userId, reassignTo || null)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
