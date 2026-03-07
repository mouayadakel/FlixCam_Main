/**
 * GET  – list authors (admin, paginated, search)
 * POST – create author
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlogService } from '@/lib/services/blog.service'
import { createAuthorSchema, authorListParamsSchema } from '@/lib/validators/blog.validator'
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

export async function GET(request: NextRequest) {
  const authResult = await requireBlogAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const parsed = authorListParamsSchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? 1,
      pageSize: searchParams.get('pageSize') ?? 20,
    })
    const params = parsed.success ? parsed.data : { page: 1, pageSize: 20 }
    const result = await BlogService.getAuthorsForAdmin(params)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireBlogAdmin()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const body = await request.json()
    const parsed = createAuthorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const author = await BlogService.createAuthor(parsed.data, userId)
    return NextResponse.json(author)
  } catch (error) {
    return handleApiError(error)
  }
}
