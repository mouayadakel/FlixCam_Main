/**
 * POST /api/admin/promissory-notes/[id]/upload-pdf – Upload PDF for promissory note (letterType: pdf)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, 'settings.update' as never)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const note = await prisma.promissoryNote.findFirst({
      where: { id },
      select: { id: true, noteNumber: true },
    })
    if (!note) return NextResponse.json({ error: 'سند الأمر غير موجود' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. يُقبل PDF فقط.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز 10 ميجابايت' }, { status: 400 })
    }

    const dir = path.join(process.cwd(), 'storage', 'promissory-notes', 'letters')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const ext = path.extname(file.name) || '.pdf'
    const filename = `PN-${note.noteNumber}-letter${ext}`.replace(/[/\\?%*:|"<>]/g, '-')
    const filePath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    await prisma.promissoryNote.update({
      where: { id },
      data: {
        letterType: 'pdf',
        letterPdfUrl: filePath,
      },
    })

    return NextResponse.json({ success: true, letterPdfUrl: filePath })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
