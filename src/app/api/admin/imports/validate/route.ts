/**
 * @file route.ts
 * @description API endpoint for validating import data without creating products
 * @module app/api/admin/imports/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { validateImportRows } from '@/lib/services/import-validation.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imports/validate
 * Validate import rows without creating products
 */
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { rows } = body

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid request: rows array required' }, { status: 400 })
    }

    // Validate rows
    const result = await validateImportRows(rows)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Validation failed:', error)
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}
