/**
 * GET /api/admin/promissory-notes/[id] – Get promissory note detail (admin)
 * PATCH /api/admin/promissory-notes/[id] – Enforce or fulfill (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import {
  getPromissoryNoteById,
  enforcePromissoryNote,
  fulfillPromissoryNote,
} from '@/lib/services/promissory-note.service'

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
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const note = await prisma.promissoryNote.findFirst({
      where: { id },
      include: {
        booking: { select: { id: true, bookingNumber: true, status: true } },
        debtor: { select: { id: true, name: true, email: true, phone: true } },
      },
    })
    if (!note) return NextResponse.json({ error: 'سند الأمر غير موجود' }, { status: 404 })

    return NextResponse.json({
      ...note,
      amountSar: Number(note.amountSar),
      equipmentPurchaseValue: note.equipmentPurchaseValue
        ? Number(note.equipmentPurchaseValue)
        : null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
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

    const body = await request.json().catch(() => ({}))
    const action = body.action as string

    if (action === 'enforce') {
      await enforcePromissoryNote(id, session.user.id, body.reason as string | undefined)
      const updated = await getPromissoryNoteById(id)
      return NextResponse.json(updated)
    }
    if (action === 'fulfill') {
      await fulfillPromissoryNote(id)
      const updated = await getPromissoryNoteById(id)
      return NextResponse.json(updated)
    }
    if (action === 'updateLetter') {
      const letterContent = body.letterContent as string | undefined
      const letterType = body.letterType as 'generated' | 'pdf' | undefined
      await prisma.promissoryNote.update({
        where: { id },
        data: {
          ...(letterContent !== undefined && { letterContent: letterContent || null }),
          ...(letterType && { letterType }),
        },
      })
      const updated = await prisma.promissoryNote.findFirst({
        where: { id },
        include: { booking: { select: { id: true, bookingNumber: true, status: true } }, debtor: { select: { id: true, name: true, email: true, phone: true } } },
      })
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({
        ...updated,
        amountSar: Number(updated.amountSar),
        equipmentPurchaseValue: updated.equipmentPurchaseValue ? Number(updated.equipmentPurchaseValue) : null,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
