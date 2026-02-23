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

const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
]

/**
 * Validate URL for SSRF protection.
 * Blocks private IPs, IPv6 loopback, HTTP in production, and any domain not in ALLOWED_DOMAINS.
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      console.warn('[SSRF] Rejected non-HTTP(S) protocol:', parsed.protocol)
      return false
    }

    if (process.env.NODE_ENV === 'production' && parsed.protocol === 'http:') {
      console.warn('[SSRF] Rejected HTTP URL in production:', url)
      return false
    }

    if (PRIVATE_IPV4_RANGES.some((r) => r.test(hostname))) {
      console.warn('[SSRF] Rejected private IPv4:', hostname)
      return false
    }

    if (
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname.startsWith('fc00') ||
      hostname.startsWith('fe80') ||
      hostname.startsWith('fd')
    ) {
      console.warn('[SSRF] Rejected loopback/private hostname:', hostname)
      return false
    }

    // Strict allowlist: never allow domains not in ALLOWED_DOMAINS (no fallback)
    if (!ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      console.warn('[SSRF] Rejected non-allowlisted domain:', hostname)
      return false
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
 * Upload image buffer to Cloudinary (exported for image-sourcing pipeline).
 */
export async function uploadBufferToCloudinary(
  imageBuffer: Buffer,
  folder: string = 'products'
): Promise<ImageProcessingResult> {
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
    const result = await uploadBufferToCloudinary(imageBuffer, folder)

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
  const results = await Promise.allSettled(imageUrls.map((url) => processImageFromUrl(url, folder)))

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
