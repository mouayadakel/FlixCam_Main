/**
 * Tests for POST /api/admin/imports/validate
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimitAPI: jest.fn(() => ({ allowed: true })),
}))

jest.mock('@/lib/services/import-validation.service', () => ({
  validateImportRows: jest.fn(),
}))

import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { validateImportRows } from '@/lib/services/import-validation.service'
import { POST } from '@/app/api/admin/imports/validate/route'

const mockAuth = auth as jest.Mock
const mockValidateImportRows = validateImportRows as jest.Mock

function createRequest(body: unknown) {
  return new Request('http://localhost/api/admin/imports/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/imports/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createRequest({ rows: [] })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockValidateImportRows).not.toHaveBeenCalled()
  })

  it('returns 400 when rows is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createRequest({})
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('rows array')
    expect(mockValidateImportRows).not.toHaveBeenCalled()
  })

  it('returns 400 when rows is not array', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createRequest({ rows: 'invalid' })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    expect(mockValidateImportRows).not.toHaveBeenCalled()
  })

  it('returns 200 with validation result when valid rows provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockValidateImportRows.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    })
    const req = createRequest({ rows: [{ name: 'Product 1', sku: 'SKU-1' }] })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(true)
    expect(data.errors).toEqual([])
    expect(mockValidateImportRows).toHaveBeenCalledWith([{ name: 'Product 1', sku: 'SKU-1' }])
  })
})
