/**
 * POST – upload image to Cloudinary (blog folder)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { uploadBufferToCloudinary } from '@/lib/services/image-processing.service'

export const dynamic = 'force-dynamic'

const BLOG_FOLDER = 'blog'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(userId, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await uploadBufferToCloudinary(buffer, BLOG_FOLDER)

    if (!result.success || !result.url) {
      return NextResponse.json({ error: result.error ?? 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/admin/blog/upload-image]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
