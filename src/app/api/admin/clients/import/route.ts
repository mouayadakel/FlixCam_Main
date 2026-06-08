/**
 * POST /api/admin/clients/import — import customers from Excel/CSV
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import {
  CustomerImportService,
  mapSpreadsheetRow,
} from '@/lib/services/customer-import.service'
import * as XLSX from '@e965/xlsx'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const allowed = await hasPermission(session.user.id, PERMISSIONS.CLIENT_CREATE)
    if (!allowed) throw new ForbiddenError()

    const formData = await request.formData()
    const file = formData.get('file')
    const updateExisting = formData.get('updateExisting') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const mapped = rawRows
      .map((row, index) => mapSpreadsheetRow(row, index + 2))
      .filter((row): row is NonNullable<typeof row> => row != null)

    if (mapped.length === 0) {
      return NextResponse.json({ error: 'No valid rows with email found' }, { status: 400 })
    }

    const result = await CustomerImportService.importRows(mapped, session.user.id, {
      updateExisting,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return handleApiError(error)
  }
}
