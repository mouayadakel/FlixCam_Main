/**
 * @file api/quotes/[id]/pdf/route.ts
 * @description API route for quote PDF download
 * @module api/quotes
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { QuoteService } from '@/lib/services/quote.service'
import { QuotePolicy } from '@/lib/policies/quote.policy'
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
    const policy = await QuotePolicy.canView(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const quote = await QuoteService.getById(id, userId)
    const locale = (req.nextUrl.searchParams.get('locale') as 'ar' | 'en') || 'en'

    const buffer = PdfService.generateQuotePdfBuffer({
      quote,
      locale,
    })

    const filename = `quote-${quote.quoteNumber}.pdf`
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
    console.error('Quote PDF error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
