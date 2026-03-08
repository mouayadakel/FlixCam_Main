/**
 * GET /api/checkout/serve-photo?id=filename – Serve ID photo from private storage.
 * Requires auth. Acts as signed URL equivalent for local storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { handleApiError } from '@/lib/utils/api-helpers'

const UPLOAD_DIR = join(process.cwd(), 'storage', 'uploads', 'checkout')

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id || /[^a-zA-Z0-9._-]/.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const filepath = join(UPLOAD_DIR, id)
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await readFile(filepath)
    const ext = id.split('.').pop()?.toLowerCase()
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
