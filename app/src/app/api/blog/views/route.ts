/**
 * POST /api/blog/views - Increment view count.
 * IP-deduplicated. Rate limited.
 */

import { NextResponse } from 'next/server'
import { BlogService } from '@/lib/services/blog.service'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { getClientIP } from '@/lib/utils/rate-limit'
import { createHash } from 'crypto'
import { z } from 'zod'

const schema = z.object({ postId: z.string().cuid() })

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.VIEWS_SALT ?? 'blog')).digest('hex')
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)
    const { allowed } = await checkRateLimitUpstash(request, 'public')
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { postId } = parsed.data
    const ipHash = hashIp(ip)

    const alreadyViewed = await BlogService.hasViewed(postId, ipHash)
    if (alreadyViewed) {
      return NextResponse.json({ success: true, counted: false })
    }

    const userAgent = request.headers.get('user-agent') ?? undefined
    const referrer = request.headers.get('referer') ?? undefined
    await BlogService.incrementViews(postId, ipHash, userAgent, referrer)
    return NextResponse.json({ success: true, counted: true })
  } catch (error) {
    console.error('[blog/views]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
