/**
 * @file api/contracts/[id]/pdf/route.ts
 * @description API route for contract PDF download
 * @module api/contracts
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ContractService } from '@/lib/services/contract.service'
import { ContractPolicy } from '@/lib/policies/contract.policy'
import { PdfService } from '@/lib/services/pdf.service'
import { ForbiddenError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const policy = await ContractPolicy.canView(userId, params.id)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const contract = await ContractService.getById(params.id, userId)
    const locale = (req.nextUrl.searchParams.get('locale') as 'ar' | 'en') || 'en'

    const buffer = PdfService.generateContractPdfBuffer({
      contract,
      locale,
    })

    const filename = `contract-${params.id}.pdf`
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
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    console.error('Contract PDF error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
