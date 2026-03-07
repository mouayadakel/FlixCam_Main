/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/utils/api-helpers.ts
 * FEATURE: API error handling
 * UNITS: handleApiError
 * ═══════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleApiError } from '@/lib/utils/api-helpers'
import { AppError, ValidationError, NotFoundError } from '@/lib/errors'

// Mock NextResponse.json to avoid Next.js runtime
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

// ─────────────────────────────────────
// UNIT: handleApiError
// REQUIREMENTS:
//   - When error is AppError: return JSON { error: error.message }, status = error.statusCode.
//   - When error is ZodError: return JSON { error: 'Validation failed', details: error.flatten() }, status 400.
//   - When NODE_ENV=production and error is not AppError/ZodError: return JSON { error: 'Internal server error' }, status 500.
//   - When not production and error is Error: return JSON { error: error.message }, status 500; console.error called.
//   - When not production and error is not Error: return JSON { error: 'Unknown error' }, status 500.
// ─────────────────────────────────────

describe('handleApiError', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    })
    jest.restoreAllMocks()
  })

  describe('AppError handling', () => {
    it('returns JSON with error message and statusCode when error is AppError', () => {
      // Arrange
      const error = new AppError('Custom message', 418, 'CUSTOM_CODE')

      // Act
      const response = handleApiError(error) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(418)
      expect(response.body).toEqual({ error: 'Custom message' })
    })

    it('returns 400 when error is ValidationError', () => {
      // Arrange
      const error = new ValidationError('Invalid input', { email: ['Required'] })

      // Act
      const response = handleApiError(error) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Invalid input' })
    })

    it('returns 404 when error is NotFoundError', () => {
      // Arrange
      const error = new NotFoundError('Booking', 'bk_123')

      // Act
      const response = handleApiError(error) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Booking with id bk_123 not found')
    })
  })

  describe('ZodError handling', () => {
    it('returns 400 with validation failed and details when error is ZodError', () => {
      // Arrange
      const error = new z.ZodError([
        { path: ['email'], message: 'Invalid email', code: 'invalid_string', validation: 'email' },
      ])

      // Act
      const response = handleApiError(error) as unknown as {
        body: { error: string; details: unknown }
        status: number
      }

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toBeDefined()
      expect(typeof response.body.details).toBe('object')
    })
  })

  describe('production mode', () => {
    it('returns 500 with generic message when in production and error is generic Error', () => {
      // Arrange
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
      const error = new Error('Sensitive stack trace')

      // Act
      const response = handleApiError(error) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })

    it('returns 500 with generic message when in production and error is unknown', () => {
      // Arrange
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

      // Act
      const response = handleApiError('string throw') as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Internal server error')
    })
  })

  describe('non-production mode', () => {
    it('returns 500 with error message when error is Error and not production', () => {
      // Arrange
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      const error = new Error('Database connection failed')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Act
      const response = handleApiError(error) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Database connection failed')
      expect(consoleSpy).toHaveBeenCalledWith('[api-helpers]', error)
      consoleSpy.mockRestore()
    })

    it('returns 500 with Unknown error when error is not Error instance and not production', () => {
      // Arrange
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })

      // Act
      const response = handleApiError(42) as unknown as { body: { error: string }; status: number }

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Unknown error')
    })
  })
})
