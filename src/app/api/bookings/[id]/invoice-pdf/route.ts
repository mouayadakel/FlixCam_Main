/**
 * GET /api/bookings/[id]/invoice-pdf - Generate and download invoice PDF for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { InvoicePdfService } from '@/lib/services/invoice-pdf.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const booking = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      studio: true,
      equipment: { include: { equipment: true } },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Only the customer or admin can download
  const isOwner = booking.customerId === session.user.id
  if (!isOwner) {
    const { hasPermission } = await import('@/lib/auth/permissions')
    const canView = await hasPermission(session.user.id, 'booking.read' as any)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const isStudio = !!booking.studioId
  const studioData = booking.studio as any

  // Build line items
  const items: { description: string; quantity: number; unitPrice: number; total: number }[] = []

  if (isStudio && studioData) {
    const hours =
      booking.studioStartTime && booking.studioEndTime
        ? Math.max(
            1,
            Math.round(
              (booking.studioEndTime.getTime() - booking.studioStartTime.getTime()) / 3600000
            )
          )
        : 1
    const hourlyRate = Number(studioData.hourlyRate ?? 0)
    items.push({
      description: `Studio: ${studioData.name}`,
      quantity: hours,
      unitPrice: hourlyRate,
      total: Number(booking.totalAmount),
    })
  }

  for (const be of booking.equipment) {
    const eq = be.equipment as { name?: string; model?: string; dailyPrice?: unknown }
    const days = Math.max(
      1,
      Math.ceil((booking.endDate.getTime() - booking.startDate.getTime()) / 86400000)
    )
    const unitPrice = Number(eq?.dailyPrice ?? 0)
    items.push({
      description: eq?.name ?? eq?.model ?? 'Equipment',
      quantity: be.quantity,
      unitPrice,
      total: unitPrice * be.quantity * days,
    })
  }

  if (items.length === 0) {
    items.push({
      description: 'Booking',
      quantity: 1,
      unitPrice: Number(booking.totalAmount),
      total: Number(booking.totalAmount),
    })
  }

  const subtotal = Number(booking.totalAmount)
  const vatAmount = Number(booking.vatAmount ?? 0)
  const total = subtotal + vatAmount

  let studioDate: string | null = null
  let studioTime: string | null = null
  if (booking.studioStartTime && booking.studioEndTime) {
    studioDate = booking.studioStartTime.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    studioTime = `${booking.studioStartTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${booking.studioEndTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }

  const pdfBuffer = InvoicePdfService.generate({
    invoiceNumber: `INV-${booking.bookingNumber}`,
    bookingNumber: booking.bookingNumber,
    issueDate: booking.createdAt,
    customerName: booking.customer?.name ?? 'Customer',
    customerEmail: booking.customer?.email ?? '',
    customerPhone: booking.customer?.phone ?? undefined,
    items,
    subtotal,
    vatRate: 15,
    vatAmount,
    total,
    studioName: studioData?.name,
    studioAddress: studioData?.address,
    studioDate,
    studioTime,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${booking.bookingNumber}.pdf"`,
    },
  })
}
