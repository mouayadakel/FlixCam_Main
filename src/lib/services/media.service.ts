/**
 * @file media.service.ts
 * @description Business logic for media management
 * @module services/media
 */

import { prisma } from '@/lib/db/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'equipment')

export interface MediaInput {
  url: string
  type: 'image' | 'video' | 'document'
  filename: string
  mimeType: string
  size?: number
  equipmentId?: string
  studioId?: string
}

export class MediaService {
  /**
   * Upload image file and create Media record
   */
  static async uploadImage(
    file: File | { buffer: Buffer; filename: string; mimetype: string; size: number },
    equipmentId: string,
    userId: string
  ) {
    // Validate file (File has size/type; buffer object has buffer.length/mimetype)
    const fileSize = 'buffer' in file ? file.buffer.length : file.size
    const mimeType = 'mimetype' in file ? file.mimetype : file.type

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
    }

    // Create upload directory if it doesn't exist
    const equipmentDir = join(UPLOAD_DIR, equipmentId)
    if (!existsSync(equipmentDir)) {
      await mkdir(equipmentDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = 'filename' in file 
      ? file.filename.split('.').pop() || 'jpg'
      : (file.name.split('.').pop() || 'jpg')
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filepath = join(equipmentDir, filename)

    // Save file
    let buffer: Buffer
    if ('buffer' in file) {
      buffer = file.buffer
    } else {
      // File object - convert to buffer
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    }
    await writeFile(filepath, buffer)

    // Create relative URL
    const url = `/uploads/equipment/${equipmentId}/${filename}`

    // Create Media record
    const media = await prisma.media.create({
      data: {
        url,
        type: 'image',
        filename,
        mimeType,
        size: fileSize,
        equipmentId,
        createdBy: userId,
      },
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
        createdBy: userId,
      },
    })

    return media
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
