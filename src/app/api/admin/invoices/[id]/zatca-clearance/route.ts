/**
 * POST /api/admin/invoices/[id]/zatca-clearance — Full ZATCA XML + clearance for one invoice.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { clearInvoiceWithZatca } from '@/lib/services/zatca-invoice.service'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.INVOICE_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const result = await clearInvoiceWithZatca(id)

  if (result.error && result.status === 'REJECTED') {
    return NextResponse.json(result, { status: 422 })
  }

  return NextResponse.json(result)
}
