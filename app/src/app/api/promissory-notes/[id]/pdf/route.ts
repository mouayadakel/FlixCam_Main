/**
 * GET /api/promissory-notes/[id]/pdf – Download promissory note PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { generatePromissoryNotePdf } from '@/lib/services/pdf/promissory-note-pdf'
import * as fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const note = await prisma.promissoryNote.findFirst({
      where: { id },
      select: { debtorId: true, noteNumber: true, pdfUrl: true, letterType: true, letterPdfUrl: true },
    })

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = note.debtorId === session.user.id
    const isAdmin = await hasPermission(session.user.id, 'settings.read' as never)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let buffer: Buffer
    if (note.letterType === 'pdf' && note.letterPdfUrl && fs.existsSync(note.letterPdfUrl)) {
      buffer = fs.readFileSync(note.letterPdfUrl)
    } else if (note.pdfUrl && fs.existsSync(note.pdfUrl)) {
      buffer = fs.readFileSync(note.pdfUrl)
    } else {
      buffer = await generatePromissoryNotePdf(id)
    }

    const filename = `promissory-note-${note.noteNumber}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
