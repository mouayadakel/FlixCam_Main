/**
 * GET /api/admin/studios/[id]/media - List studio media
 * POST /api/admin/studios/[id]/media - Add media from URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { MediaService } from '@/lib/services/media.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const addMediaSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(500).optional().nullable(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(new NextRequest(new URL('http://localhost')))
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_READ))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const media = await MediaService.getMediaByStudio(id)
    return NextResponse.json({ data: media })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)
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
    const { id } = await params
    const studio = await prisma.studio.findFirst({
      where: { id, deletedAt: null },
    })
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
    }
    const body = await request.json()
    const { url, altText } = addMediaSchema.parse(body)
    const filename = url.split('/').pop() || `image-${Date.now()}.jpg`
    const media = await MediaService.createMediaFromUrl(
      {
        url,
        type: 'image',
        filename,
        mimeType: 'image/jpeg',
        studioId: id,
        altText: altText ?? undefined,
      },
      session.user.id
    )
    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
