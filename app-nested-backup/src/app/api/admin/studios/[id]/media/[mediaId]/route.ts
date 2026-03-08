/**
 * DELETE /api/admin/studios/[id]/media/[mediaId] - Remove media from studio
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { MediaService } from '@/lib/services/media.service'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, mediaId } = await params
    const media = await prisma.media.findFirst({
      where: { id: mediaId, studioId: id, deletedAt: null },
    })
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }
    await MediaService.deleteMedia(mediaId, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
