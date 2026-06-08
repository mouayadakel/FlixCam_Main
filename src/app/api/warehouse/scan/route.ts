/**
 * @file route.ts
 * @description Warehouse barcode lookup for check-out/check-in pages
 * @module app/api/warehouse/scan
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, ValidationError } from '@/lib/errors'
import { BarcodeService } from '@/lib/services/barcode.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const { barcode, bookingId } = body as { barcode: string; bookingId?: string }

    if (!barcode?.trim()) {
      throw new ValidationError('الرمز الشريطي (Barcode) مطلوب')
    }

    if (bookingId) {
      const lookup = await BarcodeService.lookupForBooking(barcode, bookingId)
      return NextResponse.json({
        ok: true,
        equipment: lookup,
        bookingEquipmentId: lookup.bookingEquipmentId,
      })
    }

    const lookup = await BarcodeService.lookupByBarcode(barcode)
    return NextResponse.json({ ok: true, equipment: lookup })
  } catch (error) {
    return handleApiError(error)
  }
}
