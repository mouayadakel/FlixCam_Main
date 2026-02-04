/**
 * POST /api/portal/bookings/[id]/report-damage
 * Customer reports damage for their booking (Phase 4.6).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const reportDamageSchema = z.object({
  equipmentId: z.string().cuid().optional().nullable(),
  damageType: z.enum([
    'PHYSICAL_DAMAGE',
    'MALFUNCTION',
    'MISSING_PARTS',
    'EXCESSIVE_WEAR',
    'LOSS',
    'OTHER',
  ]),
  severity: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS']),
  description: z.string().min(1, 'الوصف مطلوب').max(5000),
  photos: z.array(z.string().url()).optional().nullable(),
  estimatedCost: z.number().min(0, 'التكلفة التقديرية يجب أن تكون ≥ 0'),
  insuranceClaim: z.boolean().optional().default(false),
})

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id: bookingId } = await params
    const body = await request.json()
    const parsed = reportDamageSchema.parse(body)

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.user.id,
        deletedAt: null,
      },
      include: {
        equipment: { where: { deletedAt: null }, select: { equipmentId: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'الحجز غير موجود أو غير مخصص لك' }, { status: 404 })
    }

    // Only ACTIVE or RETURNED bookings can have damage reported
    if (!['ACTIVE', 'RETURNED'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'يمكن الإبلاغ عن ضرر فقط للحجوزات النشطة أو المرتجعة' },
        { status: 400 }
      )
    }

    if (parsed.equipmentId) {
      const belongs = booking.equipment.some((be) => be.equipmentId === parsed.equipmentId)
      if (!belongs) {
        return NextResponse.json(
          { error: 'المعدة المحددة غير مرتبطة بهذا الحجز' },
          { status: 400 }
        )
      }
    }

    const claim = await prisma.damageClaim.create({
      data: {
        bookingId,
        equipmentId: parsed.equipmentId ?? null,
        studioId: booking.studioId,
        reportedBy: session.user.id,
        damageType: parsed.damageType,
        severity: parsed.severity,
        description: parsed.description,
        photos: parsed.photos ?? undefined,
        estimatedCost: new Decimal(parsed.estimatedCost),
        insuranceClaim: parsed.insuranceClaim ?? false,
      },
      include: {
        booking: { select: { id: true, bookingNumber: true } },
        equipment: { select: { id: true, sku: true, model: true } },
      },
    })

    return NextResponse.json({
      id: claim.id,
      status: claim.status,
      message: 'تم تسجيل بلاغ الضرر. سنراجعه ونتواصل معك.',
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error },
        { status: 400 }
      )
    }
    console.error('Portal report-damage error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ' },
      { status: 500 }
    )
  }
}
