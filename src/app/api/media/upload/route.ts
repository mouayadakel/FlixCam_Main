/**
 * @file route.ts
 * @description API route for media file uploads
 * @module app/api/media/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { MediaService } from '@/lib/services/media.service'
import { validateMediaUpload } from '@/lib/utils/media-upload-validation'

interface FilePayload {
  buffer: Buffer
  filename: string
  mimetype: string
  size: number
}

interface UploadPayload {
  file: FilePayload
  equipmentId: string | null
  studioId: string | null
  inspectionId: string | null
  cmsFolder: string | null
}

interface JsonUploadBody {
  fileName?: string
  mimeType?: string
  fileSize?: number
  fileBase64?: string
  equipmentId?: string
  studioId?: string
  inspectionId?: string
  cmsFolder?: string
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseBase64File(raw: string): { buffer: Buffer; mimeType: string } {
  const dataUrlMatch = raw.match(/^data:([^;,]+)?;base64,(.+)$/i)
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1] || 'application/octet-stream'
    const buffer = Buffer.from(dataUrlMatch[2], 'base64')
    return { buffer, mimeType }
  }

  return {
    buffer: Buffer.from(raw, 'base64'),
    mimeType: 'application/octet-stream',
  }
}

async function parseMultipartPayload(request: NextRequest): Promise<UploadPayload> {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    throw new Error('No file provided')
  }

  const arrayBuffer = await file.arrayBuffer()
  return {
    file: {
      buffer: Buffer.from(arrayBuffer),
      filename: file.name,
      mimetype: file.type,
      size: file.size,
    },
    equipmentId: normalizeId(formData.get('equipmentId')),
    studioId: normalizeId(formData.get('studioId')),
    inspectionId: normalizeId(formData.get('inspectionId')),
    cmsFolder: normalizeId(formData.get('cmsFolder')),
  }
}

async function parseJsonPayload(request: NextRequest): Promise<UploadPayload> {
  const body = (await request.json()) as JsonUploadBody
  if (!body?.fileBase64 || !body?.fileName) {
    throw new Error('Invalid JSON upload payload')
  }

  const parsed = parseBase64File(body.fileBase64)
  const mimeType = body.mimeType?.trim() || parsed.mimeType
  const size = typeof body.fileSize === 'number' ? body.fileSize : parsed.buffer.length

  return {
    file: {
      buffer: parsed.buffer,
      filename: body.fileName,
      mimetype: mimeType,
      size,
    },
    equipmentId: normalizeId(body.equipmentId),
    studioId: normalizeId(body.studioId),
    inspectionId: normalizeId(body.inspectionId),
    cmsFolder: normalizeId(body.cmsFolder),
  }
}

/**
 * POST /api/media/upload - Upload media file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await parseJsonPayload(request)
      : await parseMultipartPayload(request)

    if (!payload.file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    validateMediaUpload({
      filename: payload.file.filename,
      mimetype: payload.file.mimetype,
      size: payload.file.size,
    })

    const { equipmentId, studioId, inspectionId, cmsFolder } = payload
    if (!equipmentId && !studioId && !inspectionId && !cmsFolder) {
      return NextResponse.json(
        { error: 'Either equipmentId, studioId, inspectionId, or cmsFolder is required' },
        { status: 400 }
      )
    }

    // Permission checks
    if (studioId && !(await hasPermission(session.user.id, PERMISSIONS.CMS_STUDIO_UPDATE))) {
      return NextResponse.json({ error: 'Forbidden - cms.studio.update required' }, { status: 403 })
    }
    
    // Warehouse staff can upload for inspections
    if (inspectionId && !(await hasPermission(session.user.id, PERMISSIONS.WAREHOUSE_CHECK_IN))) {
      return NextResponse.json({ error: 'Forbidden - warehouse.check_in required' }, { status: 403 })
    }

    // CMS uploads require settings update permission
    if (cmsFolder && !(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
      return NextResponse.json({ error: 'Forbidden - settings.update required' }, { status: 403 })
    }

    let media
    if (studioId) {
      media = await MediaService.uploadImageForStudio(payload.file, studioId, session.user.id)
    } else if (cmsFolder) {
      media = await MediaService.uploadImageForCms(payload.file, cmsFolder, session.user.id)
    } else if (inspectionId) {
      media = await MediaService.uploadImage(payload.file, inspectionId, session.user.id, 'inspection')
    } else {
      media = await MediaService.uploadImage(payload.file, equipmentId!, session.user.id, 'equipment')
    }

    return NextResponse.json(media, { status: 201 })
  } catch (error) {
    logger.error('Media upload failed', {
      err: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload media' },
      { status: 400 }
    )
  }
}
