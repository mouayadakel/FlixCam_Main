/**
 * POST /api/promissory-notes/booking – Create and sign booking-specific promissory note
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createBookingPromissoryNote } from '@/lib/services/promissory-note.service'
import { createBookingPromissoryNoteSchema } from '@/lib/validators/promissory-note.validator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createBookingPromissoryNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || undefined
    const device = request.headers.get('user-agent') || undefined

    const result = await createBookingPromissoryNote(parsed.data, session.user.id, { ip, device })

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
