/**
 * Cleanup ID photos older than 30 days from storage/uploads/checkout/.
 * Run via cron: 0 3 * * * npx tsx scripts/cleanup-id-photos.ts
 */

import { readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads', 'checkout')
const MAX_AGE_DAYS = 30
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

async function cleanup(): Promise<void> {
  try {
    const exists = existsSync(UPLOAD_DIR)
    if (!exists) {
      console.log('[cleanup-id-photos] Directory does not exist, skipping.')
      return
    }

    const files = await readdir(UPLOAD_DIR)
    const now = Date.now()
    let deleted = 0

    for (const file of files) {
      const filepath = join(UPLOAD_DIR, file)
      const st = await stat(filepath)
      if (!st.isFile()) continue

      const age = now - st.mtimeMs
      if (age > MAX_AGE_MS) {
        await unlink(filepath)
        deleted++
      }
    }

    if (deleted > 0) {
      console.log(`[cleanup-id-photos] Deleted ${deleted} file(s) older than ${MAX_AGE_DAYS} days.`)
    }
  } catch (err) {
    console.error('[cleanup-id-photos] Error:', err)
    process.exit(1)
  }
}

cleanup()
