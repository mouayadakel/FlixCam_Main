/**
 * @file api/invoices/[id]/pdf/route.ts
 * @description API route for invoice PDF download
 * @module api/invoices
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoicePolicy } from '@/lib/policies/invoice.policy'
import { PdfService } from '@/lib/services/pdf.service'
import { ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id
    const policy = await InvoicePolicy.canView(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const invoice = await InvoiceService.getById(id, userId)
    const locale = (req.nextUrl.searchParams.get('locale') as 'ar' | 'en') || 'en'

    const buffer = await PdfService.generateInvoicePdfBuffer({
      invoice,
      locale,
      includeZatcaQr: false,
    })

    const filename = `invoice-${invoice.invoiceNumber}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Invoice PDF error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
