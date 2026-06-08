/**
 * Media upload validation (MIME whitelist, size cap, blocked extensions).
 */

export const MEDIA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024 // 10MB

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.js',
  '.html',
  '.htm',
  '.svg+xml',
  '.svg',
])

export interface MediaUploadFile {
  filename: string
  mimetype: string
  size: number
}

export function validateMediaUpload(file: MediaUploadFile): void {
  const ext = file.filename.includes('.')
    ? file.filename.slice(file.filename.lastIndexOf('.')).toLowerCase()
    : ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(`File type not allowed: ${ext}`)
  }

  const mime = file.mimetype?.split(';')[0]?.trim().toLowerCase() || ''
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
    throw new Error(`Unsupported file type: ${mime || 'unknown'}`)
  }

  if (file.size <= 0) {
    throw new Error('Empty file')
  }

  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
    throw new Error(`File exceeds ${MEDIA_UPLOAD_MAX_BYTES / (1024 * 1024)}MB limit`)
  }
}
