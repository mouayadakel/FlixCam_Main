/**
 * @file route.ts
 * @description API route for media file uploads
 * @module app/api/media/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { MediaService } from '@/lib/services/media.service'

/**
 * POST /api/media/upload - Upload media file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const equipmentId = formData.get('equipmentId') as string | null
    const studioId = formData.get('studioId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!equipmentId && !studioId) {
      return NextResponse.json(
        { error: 'Either equipmentId or studioId is required' },
        { status: 400 }
      )
    }

    if (studioId && !(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
      return NextResponse.json({ error: 'Forbidden - cms.studio.update required' }, { status: 403 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filePayload = {
      buffer,
      filename: file.name,
      mimetype: file.type,
      size: file.size,
    }

    const media = studioId
      ? await MediaService.uploadImageForStudio(filePayload, studioId, session.user.id)
      : await MediaService.uploadImage(filePayload, equipmentId!, session.user.id)

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload media' },
      { status: 400 }
    )
  }
}
