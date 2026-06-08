/**
 * Cron: Publish scheduled blog posts whose publishedAt has passed.
 * Protected by CRON_SECRET.
 * Schedule: every 15 min or hourly via Vercel Cron / external scheduler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { BlogService } from '@/lib/services/blog.service'
import { verifyCronSecret } from '@/lib/utils/cron-auth'

export const dynamic = 'force-dynamic'

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
