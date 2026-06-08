#!/usr/bin/env npx tsx
/**
 * Bulk-upload public/photos and uploads/equipment to S3/R2.
 * Requires S3_* or R2_* env vars (see .env.example).
 */
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { uploadObject, isObjectStorageEnabled } from '../src/lib/storage/object-storage'

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...(await walk(full)))
    else files.push(full)
  }
  return files
}

async function main() {
  if (!isObjectStorageEnabled()) {
    console.error('Object storage not configured — set S3_BUCKET, S3_ACCESS_KEY_ID, etc.')
    process.exit(1)
  }

  const roots = [
    path.join(process.cwd(), process.env.PUBLIC_UPLOADS_PATH || 'public/photos'),
    path.join(process.cwd(), 'storage/uploads/equipment'),
  ]

  let uploaded = 0
  for (const root of roots) {
    try {
      await stat(root)
    } catch {
      continue
    }
    const files = await walk(root)
    for (const file of files) {
      const rel = path.relative(process.cwd(), file).replace(/^public\/photos\//, 'photos/')
      const key = rel.replace(/^storage\/uploads\/equipment\//, 'equipment/')
      const body = await readFile(file)
      const ext = path.extname(file).toLowerCase()
      const contentType =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
      await uploadObject(key, body, contentType)
      uploaded++
      if (uploaded % 50 === 0) console.log(`Uploaded ${uploaded}...`)
    }
  }

  console.log(`Done. Uploaded ${uploaded} files.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
