/**
 * POST /api/checkout/upload-document – Upload ID or other checkout document.
 * Stores in private storage; returns fileId for use with serve-photo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads', 'checkout')

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    )
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid type. Allowed: JPEG, PNG, WebP' },
      { status: 400 }
    )
  }

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `id-${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const filepath = join(UPLOAD_DIR, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  return NextResponse.json({ fileId: filename })
}
