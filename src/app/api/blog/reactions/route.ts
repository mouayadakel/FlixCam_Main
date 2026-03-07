/**
 * POST /api/blog/reactions - Add reaction (helpful yes/no).
 * One reaction per IP per post. Rate limited.
 */

import { NextResponse } from 'next/server'
import { BlogService } from '@/lib/services/blog.service'
import { reactionSchema } from '@/lib/validators/blog.validator'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { getClientIP } from '@/lib/utils/rate-limit'
import { createHash } from 'crypto'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.REACTIONS_SALT ?? 'blog')).digest('hex')
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)
    const { allowed } = await checkRateLimitUpstash(request, 'public')
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = reactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { postId, type } = parsed.data
    const ipHash = hashIp(ip)

    const counts = await BlogService.addReaction(postId, type, ipHash)
    return NextResponse.json({ success: true, counts })
  } catch (error) {
    console.error('[blog/reactions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
