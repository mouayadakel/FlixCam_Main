/**
 * @file error-response.ts
 * @description Standardized API error response utilities
 * @module lib/api/error-response
 */

import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

/**
 * Return a standardized JSON error response.
 */
export function apiError(message: string, status: number = 500, code?: string) {
  return NextResponse.json({ error: message, code: code ?? `HTTP_${status}`, status }, { status })
}

/**
 * Map AppError (and subclasses) to a NextResponse. Use in API route catch blocks.
 */
export function errorToResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return apiError(err.message, err.statusCode, err.code)
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  return apiError(message, 500, 'INTERNAL_ERROR')
}
