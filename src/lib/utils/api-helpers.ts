/**
 * @file api-helpers.ts
 * @description API route helpers (error handling, response shaping)
 * @module lib/utils/api-helpers
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AppError } from '@/lib/errors'

/**
 * Centralized API error handler. Maps thrown errors to NextResponse with appropriate status and body.
 * Use in API route catch blocks: return handleApiError(error)
 *
 * @param error - Caught value (unknown); narrowed via instanceof
 * @returns NextResponse with JSON body and correct status code
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.flatten() },
      { status: 400 }
    )
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const message = isProduction
    ? 'Internal server error'
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  if (!isProduction && error instanceof Error) {
    console.error('[api-helpers]', error)
  }

  return NextResponse.json({ error: message }, { status: 500 })
}
