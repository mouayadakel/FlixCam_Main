/**
 * Cron: Publish scheduled blog posts whose publishedAt has passed.
 * Protected by CRON_SECRET.
 * Schedule: every 15 min or hourly via Vercel Cron / external scheduler.
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { BlogService } from '@/lib/services/blog.service'

export const dynamic = 'force-dynamic'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')
  const provided =
    cronSecret ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)

  if (!secret || !provided) return false
  const secretBuf = Buffer.from(secret, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  return secretBuf.length === providedBuf.length && crypto.timingSafeEqual(secretBuf, providedBuf)
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await BlogService.publishScheduledPosts()
    revalidatePath('/blog')
    revalidatePath('/blog/[slug]', 'page')
    return NextResponse.json({ published: count })
  } catch (error) {
    console.error('Cron publish-scheduled-blog failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    )
  }
}
