/**
 * Webhook for instant blog revalidation.
 * Call after publishing/updating a post from CMS or admin.
 * Optional: Authorization: Bearer <REVALIDATE_BLOG_SECRET>
 * If no secret configured, requires CRON_SECRET for backward compatibility.
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { BlogService } from '@/lib/services/blog.service'

export const dynamic = 'force-dynamic'

function verifySecret(request: NextRequest): boolean {
  const secret =
    process.env.REVALIDATE_BLOG_SECRET ?? process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const provided =
    request.headers.get('x-revalidate-secret') ??
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)

  if (!secret || !provided) return false
  const secretBuf = Buffer.from(secret, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  return secretBuf.length === providedBuf.length && crypto.timingSafeEqual(secretBuf, providedBuf)
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await BlogService.publishScheduledPosts()
    revalidatePath('/blog')
    return NextResponse.json({
      revalidated: true,
      scheduledPublished: count,
    })
  } catch (error) {
    console.error('Revalidate blog failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Revalidation failed' },
      { status: 500 }
    )
  }
}
