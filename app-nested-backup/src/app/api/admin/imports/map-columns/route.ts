/**
 * @file route.ts
 * @description API endpoint for auto-mapping Excel column headers to system fields
 * @module app/api/admin/imports/map-columns
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { mapColumns } from '@/lib/services/column-mapper.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imports/map-columns
 * Body: { headers: string[] }
 * Returns suggested column mappings (sourceHeader -> mappedField) using synonyms, history, and fuzzy match.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { headers } = body as { headers?: string[] }

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty headers array' },
        { status: 400 }
      )
    }

    const mappings = await mapColumns(headers, { useHistory: true })

    return NextResponse.json({
      mappings: mappings.map((m) => ({
        sourceHeader: m.sourceHeader,
        mappedField: m.mappedField,
        confidence: m.confidence,
        method: m.method,
      })),
    })
  } catch (error: unknown) {
    console.error('Map columns failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to map columns',
      },
      { status: 500 }
    )
  }
}
