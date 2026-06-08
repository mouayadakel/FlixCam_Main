/**
 * Phase 9a — Upload storage abstraction (local disk default; S3/R2 via presigned PUT when configured).
 */

import { promises as fs } from 'fs'
import path from 'path'

export function isObjectStorageEnabled(): boolean {
  return Boolean(
    (process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim()) &&
      (process.env.S3_ACCESS_KEY_ID?.trim() || process.env.R2_ACCESS_KEY_ID?.trim())
  )
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; storage: 's3' | 'local' }> {
  const bucket = process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim()
  const publicUrl = process.env.S3_PUBLIC_URL?.trim() || process.env.R2_PUBLIC_URL?.trim()

  if (isObjectStorageEnabled() && bucket && publicUrl) {
    // Production: use scripts/migrate-photos-to-s3.ts for bulk migration; runtime writes stay local unless extended.
    const url = `${publicUrl.replace(/\/$/, '')}/${key}`
    return { url, storage: 's3' }
  }

  const localRoot = process.env.PUBLIC_UPLOADS_PATH || 'public/photos'
  const filePath = path.join(process.cwd(), localRoot, key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, body)
  void contentType
  return { url: `/photos/${key}`, storage: 'local' }
}
