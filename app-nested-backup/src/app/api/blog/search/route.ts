/**
 * GET /api/blog/search - Server-side blog search.
 * Query params: q, category, tags, sort, page, limit.
 * Rate limited (100/min).
 */

import { NextResponse } from 'next/server'
import { BlogService } from '@/lib/services/blog.service'
import { searchParamsSchema } from '@/lib/validators/blog.validator'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

export async function GET(request: Request) {
  try {
    const { allowed } = await checkRateLimitUpstash(request, 'public')
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const raw = {
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      tags: searchParams.getAll('tags').length ? searchParams.getAll('tags') : searchParams.get('tags') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }
    const parsed = searchParamsSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid params', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await BlogService.searchPosts(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[blog/search]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
