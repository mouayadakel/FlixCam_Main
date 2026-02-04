/**
 * @file route.ts
 * @description API route for media file uploads
 * @module app/api/media/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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
    const equipmentId = formData.get('equipmentId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!equipmentId) {
      return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 })
    }

    // Convert File to buffer for MediaService
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const media = await MediaService.uploadImage(
      {
        buffer,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
      },
      equipmentId,
      session.user.id
    )

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload media' },
      { status: 400 }
    )
  }
}
