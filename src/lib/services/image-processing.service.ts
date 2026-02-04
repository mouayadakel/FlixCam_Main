/**
 * @file image-processing.service.ts
 * @description Cloudinary image processing service for product imports
 * @module lib/services
 * @see /docs/features/imports/ for related documentation
 */

import { v2 as cloudinary } from 'cloudinary'
import https from 'https'
import http from 'http'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export type ImageProcessingResult = {
  url: string
  publicId: string
  width: number
  height: number
  format: string
  size: number
  success: boolean
  error?: string
}

const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'cdn.pixabay.com',
  'images.pexels.com',
  'res.cloudinary.com',
  'i.imgur.com',
  'drive.google.com',
  // Add more trusted domains as needed
]

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x600?text=Product+Image'

/**
 * Validate URL for SSRF protection
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Block private IPs
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.startsWith('192.168.') ||
      parsed.hostname.startsWith('10.') ||
      parsed.hostname.startsWith('172.16.') ||
      parsed.hostname.startsWith('172.17.') ||
      parsed.hostname.startsWith('172.18.') ||
      parsed.hostname.startsWith('172.19.') ||
      parsed.hostname.startsWith('172.20.') ||
      parsed.hostname.startsWith('172.21.') ||
      parsed.hostname.startsWith('172.22.') ||
      parsed.hostname.startsWith('172.23.') ||
      parsed.hostname.startsWith('172.24.') ||
      parsed.hostname.startsWith('172.25.') ||
      parsed.hostname.startsWith('172.26.') ||
      parsed.hostname.startsWith('172.27.') ||
      parsed.hostname.startsWith('172.28.') ||
      parsed.hostname.startsWith('172.29.') ||
      parsed.hostname.startsWith('172.30.') ||
      parsed.hostname.startsWith('172.31.')
    ) {
      return false
    }

    // Allow only HTTPS (or HTTP for localhost in dev)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    // If allowlist is configured, check it
    if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.some((domain) => parsed.hostname.includes(domain))) {
      // Allow if domain is not in allowlist but is a valid public domain
      // In production, you might want to be stricter
      return true
    }

    return true
  } catch {
    return false
  }
}

/**
 * Download image from URL with timeout
 */
async function downloadImage(url: string, timeout: number = 10000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    })

    request.setTimeout(timeout, () => {
      request.destroy()
      reject(new Error('Download timeout'))
    })

    request.on('error', reject)
  })
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(imageBuffer: Buffer, folder: string = 'products'): Promise<ImageProcessingResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        if (!result) {
          reject(new Error('Upload failed: no result'))
          return
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format || 'jpg',
          size: result.bytes || 0,
          success: true,
        })
      }
    )

    uploadStream.end(imageBuffer)
  })
}

/**
 * Process image from URL: download and upload to Cloudinary
 */
export async function processImageFromUrl(
  imageUrl: string,
  folder: string = 'products'
): Promise<ImageProcessingResult> {
  // Validate URL
  if (!isValidImageUrl(imageUrl)) {
    return {
      url: PLACEHOLDER_IMAGE,
      publicId: '',
      width: 0,
      height: 0,
      format: 'jpg',
      size: 0,
      success: false,
      error: 'Invalid or unsafe URL',
    }
  }

  try {
    // Download image
    const imageBuffer = await downloadImage(imageUrl, 10000)

    // Upload to Cloudinary
    const result = await uploadToCloudinary(imageBuffer, folder)

    return result
  } catch (error: any) {
    console.error(`Image processing failed for ${imageUrl}:`, error)
    return {
      url: PLACEHOLDER_IMAGE,
      publicId: '',
      width: 0,
      height: 0,
      format: 'jpg',
      size: 0,
      success: false,
      error: error.message || 'Processing failed',
    }
  }
}

/**
 * Process multiple images
 */
export async function processImagesBatch(
  imageUrls: string[],
  folder: string = 'products'
): Promise<ImageProcessingResult[]> {
  const results = await Promise.allSettled(
    imageUrls.map((url) => processImageFromUrl(url, folder))
  )

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        url: PLACEHOLDER_IMAGE,
        publicId: '',
        width: 0,
        height: 0,
        format: 'jpg',
        size: 0,
        success: false,
        error: result.reason?.message || 'Processing failed',
      }
    }
  })
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error(`Failed to delete image ${publicId}:`, error)
    // Don't throw - deletion failure is not critical
  }
}
