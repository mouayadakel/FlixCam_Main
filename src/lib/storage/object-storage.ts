/**
 * Object storage — local disk or S3-compatible (AWS S3 / Cloudflare R2).
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'

interface StorageConfig {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}

function getStorageConfig(): StorageConfig | null {
  const bucket = process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim()
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() || process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() || process.env.R2_SECRET_ACCESS_KEY?.trim()
  const publicUrl = process.env.S3_PUBLIC_URL?.trim() || process.env.R2_PUBLIC_URL?.trim()
  const endpoint = process.env.S3_ENDPOINT?.trim() || process.env.R2_ENDPOINT?.trim()
  const region = process.env.S3_REGION?.trim() || 'auto'

  if (!bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null

  return { bucket, region, endpoint, accessKeyId, secretAccessKey, publicUrl }
}

let _client: S3Client | null = null

function getS3Client(cfg: StorageConfig): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: Boolean(cfg.endpoint),
    })
  }
  return _client
}

export function isObjectStorageEnabled(): boolean {
  return getStorageConfig() !== null
}

export function resolvePublicUrl(key: string): string {
  const cfg = getStorageConfig()
  if (cfg) return `${cfg.publicUrl.replace(/\/$/, '')}/${key}`
  return `/photos/${key}`
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; storage: 's3' | 'local'; key: string }> {
  const cfg = getStorageConfig()

  if (cfg) {
    const client = getS3Client(cfg)
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    return { url: resolvePublicUrl(key), storage: 's3', key }
  }

  const localRoot = process.env.PUBLIC_UPLOADS_PATH || 'public/photos'
  const filePath = path.join(process.cwd(), localRoot, key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, body)
  return { url: `/photos/${key}`, storage: 'local', key }
}
