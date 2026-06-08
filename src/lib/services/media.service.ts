/**
 * @file media.service.ts
 * @description Business logic for media management
 * @module services/media
 */

import { prisma } from '@/lib/db/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { isObjectStorageEnabled, uploadObject } from '@/lib/storage/object-storage'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (equipment, studio, inspection)
/** CMS uploads (e.g. hero banners) may use larger hero assets */
const MAX_CMS_FILE_SIZE = 30 * 1024 * 1024 // 30MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/bmp',
  'image/tiff',
]

/** Map file extension to MIME when the browser sends empty type or application/octet-stream */
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heic',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'equipment')
const STUDIO_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'studios')
const INSPECTION_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'inspections')
const CMS_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'cms')

export interface MediaInput {
  url: string
  type: 'image' | 'video' | 'document'
  filename: string
  mimeType: string
  size?: number
  equipmentId?: string
  studioId?: string
  altText?: string
}

export class MediaService {
  private static resolveImageMimeType(rawMime: string, filename: string): string {
    const m = (rawMime || '').trim().toLowerCase()
    if (m && m !== 'application/octet-stream') {
      return m
    }
    const ext = (filename.split('.').pop() || '').toLowerCase()
    return EXT_TO_MIME[ext] || m || 'application/octet-stream'
  }

  private static sanitizeFolder(folder: string) {
    return folder
      .toLowerCase()
      .replace(/[^a-z0-9/_-]/g, '')
      .replace(/\.\./g, '')
      .replace(/^\/+|\/+$/g, '') || 'general'
  }

  /**
   * Upload image file and create Media record
   */
  static async uploadImage(
    file: File | { buffer: Buffer; filename: string; mimetype: string; size: number },
    id: string, // equipmentId or inspectionId
    userId: string,
    type: 'equipment' | 'inspection' = 'equipment'
  ) {
    // Validate file (File has size/type; buffer object has buffer.length/mimetype)
    const fileSize = 'buffer' in file ? file.buffer.length : file.size
    const rawMime = 'mimetype' in file ? file.mimetype : file.type
    const filename = 'filename' in file ? file.filename : file.name
    const mimeType = MediaService.resolveImageMimeType(rawMime, filename)

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    }

    // Create upload directory if it doesn't exist
    const baseDir = type === 'equipment' ? UPLOAD_DIR : INSPECTION_UPLOAD_DIR
    const targetDir = join(baseDir, id)
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension =
      'filename' in file
        ? file.filename.split('.').pop() || 'jpg'
        : file.name.split('.').pop() || 'jpg'
    const storedName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filepath = join(targetDir, storedName)

    // Save file
    let buffer: Buffer
    if ('buffer' in file) {
      buffer = file.buffer
    } else {
      // File object - convert to buffer
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }
    const objectKey =
      type === 'equipment'
        ? `equipment/${id}/${storedName}`
        : `inspections/${id}/${storedName}`

    let url: string
    if (type === 'equipment' && isObjectStorageEnabled()) {
      const uploaded = await uploadObject(objectKey, buffer, mimeType)
      url = uploaded.url
    } else {
      await writeFile(filepath, buffer)
      url =
        type === 'equipment'
          ? `/uploads/equipment/${id}/${storedName}`
          : `/uploads/inspections/${id}/${storedName}`
    }

    const media = await prisma.media.create({
      data: {
        url,
        type: 'image',
        filename: storedName,
        mimeType,
        size: fileSize,
        equipmentId: type === 'equipment' ? id : undefined,
        inspectionId: type === 'inspection' ? (id as any) : undefined,
        createdBy: userId,
        sortOrder: type === 'equipment' ? (await prisma.media.aggregate({
          where: { equipmentId: id, type: 'image', deletedAt: null },
          _max: { sortOrder: true },
        }).then(r => (r._max.sortOrder ?? -1) + 1)) : 0,
      } as any,
    })

    return media
  }

  /**
   * Create Media record from URL
   */
  static async createMediaFromUrl(input: MediaInput, userId: string) {
    const media = await prisma.media.create({
      data: {
        url: input.url,
        type: input.type,
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        equipmentId: input.equipmentId,
        studioId: input.studioId,
        altText: input.altText,
        createdBy: userId,
      },
    })

    return media
  }

  /**
   * Upload image for studio gallery
   */
  static async uploadImageForStudio(
    file: File | { buffer: Buffer; filename: string; mimetype: string; size: number },
    studioId: string,
    userId: string,
    sortOrder?: number
  ) {
    const fileSize = 'buffer' in file ? file.buffer.length : file.size
    const rawMime = 'mimetype' in file ? file.mimetype : file.type
    const originalName = 'filename' in file ? file.filename : file.name
    const mimeType = MediaService.resolveImageMimeType(rawMime, originalName)

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    }

    const studioDir = join(STUDIO_UPLOAD_DIR, studioId)
    if (!existsSync(studioDir)) {
      await mkdir(studioDir, { recursive: true })
    }

    const timestamp = Date.now()
    const extension =
      'filename' in file
        ? file.filename.split('.').pop() || 'jpg'
        : file.name.split('.').pop() || 'jpg'
    const storedName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filepath = join(studioDir, storedName)

    let buffer: Buffer
    if ('buffer' in file) {
      buffer = file.buffer
    } else {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }
    await writeFile(filepath, buffer)

    const url = `/uploads/studios/${studioId}/${storedName}`

    const media = await prisma.media.create({
      data: {
        url,
        type: 'image',
        filename: storedName,
        mimeType,
        size: fileSize,
        studioId,
        sortOrder: sortOrder ?? 0,
        createdBy: userId,
      },
    })

    return media
  }

  /**
   * Upload image for CMS assets (not tied to equipment/studio/inspection)
   */
  static async uploadImageForCms(
    file: File | { buffer: Buffer; filename: string; mimetype: string; size: number },
    folder: string,
    userId: string
  ) {
    const fileSize = 'buffer' in file ? file.buffer.length : file.size
    const rawMime = 'mimetype' in file ? file.mimetype : file.type
    const originalName = 'filename' in file ? file.filename : file.name
    const mimeType = MediaService.resolveImageMimeType(rawMime, originalName)

    if (fileSize > MAX_CMS_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${MAX_CMS_FILE_SIZE / 1024 / 1024}MB`
      )
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    }

    const safeFolder = this.sanitizeFolder(folder)
    const targetDir = join(CMS_UPLOAD_DIR, safeFolder)
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    const timestamp = Date.now()
    const extension =
      'filename' in file
        ? file.filename.split('.').pop() || 'jpg'
        : file.name.split('.').pop() || 'jpg'
    const storedName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filepath = join(targetDir, storedName)

    let buffer: Buffer
    if ('buffer' in file) {
      buffer = file.buffer
    } else {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }
    await writeFile(filepath, buffer)

    const url = `/uploads/cms/${safeFolder}/${storedName}`

    const media = await prisma.media.create({
      data: {
        url,
        type: 'image',
        filename: storedName,
        mimeType,
        size: fileSize,
        createdBy: userId,
      },
    })

    return media
  }

  /**
   * Get all media for studio (ordered by sortOrder)
   */
  static async getMediaByStudio(studioId: string) {
    return prisma.media.findMany({
      where: {
        studioId,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  /**
   * Reorder studio media
   */
  static async reorderStudioMedia(studioId: string, orderedIds: string[], userId: string) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.media.updateMany({
          where: { id, studioId, deletedAt: null },
          data: { sortOrder: index, updatedBy: userId },
        })
      )
    )
    return { success: true }
  }

  /**
   * Get all media for equipment
   */
  static async getMediaByEquipment(equipmentId: string) {
    const media = await prisma.media.findMany({
      where: {
        equipmentId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return media
  }

  /**
   * Delete media (soft delete)
   */
  static async deleteMedia(mediaId: string, userId: string) {
    const media = await prisma.media.findFirst({
      where: {
        id: mediaId,
        deletedAt: null,
      },
    })

    if (!media) {
      throw new Error('Media not found')
    }

    await prisma.media.update({
      where: { id: mediaId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return { success: true }
  }

  /**
   * Delete all media for equipment
   */
  static async deleteMediaByEquipment(equipmentId: string, userId: string) {
    await prisma.media.updateMany({
      where: {
        equipmentId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return { success: true }
  }

  /**
   * Get featured image for equipment
   */
  static async getFeaturedImage(equipmentId: string) {
    const media = await prisma.media.findFirst({
      where: {
        equipmentId,
        type: 'image',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return media
  }

  /**
   * Get gallery images for equipment
   */
  static async getGalleryImages(equipmentId: string) {
    const media = await prisma.media.findMany({
      where: {
        equipmentId,
        type: 'image',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip: 1, // Skip first (featured)
    })

    return media
  }

  /**
   * Get video for equipment
   */
  static async getVideo(equipmentId: string) {
    const media = await prisma.media.findFirst({
      where: {
        equipmentId,
        type: 'video',
        deletedAt: null,
      },
    })

    return media
  }
}
