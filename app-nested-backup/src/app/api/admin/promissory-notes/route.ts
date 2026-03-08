/**
 * GET /api/admin/promissory-notes – List promissory notes (admin only)
 * POST /api/admin/promissory-notes – Create promissory note manually (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import {
  listPromissoryNotesForAdmin,
  createPromissoryNoteManually,
  type CreatePromissoryNoteManuallyInput,
} from '@/lib/services/promissory-note.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0

    const result = await listPromissoryNotesForAdmin({
      status,
      search,
      limit,
      offset,
    })
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canWrite = await hasPermission(session.user.id, 'settings.update' as never)
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const debtorId = body.debtorId
    if (!debtorId || typeof debtorId !== 'string') {
      return NextResponse.json({ error: 'debtorId مطلوب' }, { status: 400 })
    }

    const letterType = body.letterType
    if (!letterType || !['generated', 'pdf'].includes(letterType)) {
      return NextResponse.json({ error: 'letterType يجب أن يكون generated أو pdf' }, { status: 400 })
    }

    const input: CreatePromissoryNoteManuallyInput = {
      debtorId,
      bookingId: body.bookingId || undefined,
      amountSar: body.amountSar != null ? Number(body.amountSar) : undefined,
      equipmentItems: Array.isArray(body.equipmentItems) ? body.equipmentItems : undefined,
      expectedReturnDate: body.expectedReturnDate || undefined,
      letterContent: body.letterContent || undefined,
      letterType,
      letterPdfUrl: body.letterPdfUrl || undefined,
    }

    const result = await createPromissoryNoteManually(input, session.user.id)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
