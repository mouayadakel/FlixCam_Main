/**
 * POST /api/checkout/validate-step – Server-side validation for checkout steps.
 * Body: { step: 1 | 2 | 3, formValues: Record<string, unknown> }
 * Returns: { valid: boolean, errors: Record<string, string> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const SAUDI_PHONE_REGEX = /^(05\d{8}|9665\d{8})$/

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { step?: number; formValues?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const step = body.step
  const formValues = body.formValues ?? {}

  if (step !== 1) {
    return NextResponse.json({ valid: true, errors: {} })
  }

  const errors: Record<string, string> = {}
  const receiverType = formValues.receiver_type as string | undefined
  const name = ((formValues.receiver_name as string) ?? '').trim()
  const phone = ((formValues.receiver_phone as string) ?? '').trim()
  const idPhoto = formValues.receiver_id_photo as string | undefined
  const method = (formValues.fulfillment_method as string) || 'PICKUP'
  const mapVal = formValues.delivery_address_map as { lat?: number; lng?: number } | undefined
  const legalAgreement = formValues.legal_agreement

  if (name.length < 2) {
    errors.receiver_name = 'Name must be at least 2 characters'
  }
  if (!SAUDI_PHONE_REGEX.test(phone)) {
    errors.receiver_phone = 'Invalid Saudi phone number'
  }
  if (!idPhoto?.trim()) {
    errors.receiver_id_photo = 'ID photo is required'
  }
  if (method === 'delivery' && (!mapVal?.lat || !mapVal?.lng)) {
    errors.delivery_address_map = 'Please select an address on the map'
  }
  if (!legalAgreement) {
    errors.legal_agreement = 'You must accept the terms and conditions'
  }

  return NextResponse.json({
    valid: Object.keys(errors).length === 0,
    errors,
  })
}
