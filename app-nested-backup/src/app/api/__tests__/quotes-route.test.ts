/**
 * Integration tests for GET/POST /api/quotes
 * Mocks auth, QuotePolicy, QuoteService; tests 401, 400, 200, 201.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/services/quote.service', () => ({
  QuoteService: { list: jest.fn(), create: jest.fn() },
}))
jest.mock('@/lib/policies/quote.policy', () => ({
  QuotePolicy: { canView: jest.fn(), canCreate: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { QuoteService } from '@/lib/services/quote.service'
import { QuotePolicy } from '@/lib/policies/quote.policy'
import { GET, POST } from '@/app/api/quotes/route'

const mockAuth = auth as jest.Mock
const mockList = QuoteService.list as jest.Mock
const mockCreate = QuoteService.create as jest.Mock
const mockCanView = QuotePolicy.canView as jest.Mock
const mockCanCreate = QuotePolicy.canCreate as jest.Mock

function createGetRequest(url = 'http://localhost/api/quotes') {
  return new NextRequest(url)
}

function createPostRequest(body: object) {
  return new NextRequest('http://localhost/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/quotes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 200 with list when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanView.mockResolvedValue({ allowed: true })
    mockList.mockResolvedValue({ quotes: [], total: 0, page: 1, pageSize: 20 })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
    expect(mockList).toHaveBeenCalledWith('user-1', expect.any(Object))
  })
})

describe('POST /api/quotes', () => {
  const validBody = {
    customerId: 'cust-1',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    equipment: [{ equipmentId: 'eq-1', quantity: 1 }],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createPostRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (missing required fields)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanCreate.mockResolvedValue({ allowed: true })
    const req = createPostRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (endDate before startDate)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanCreate.mockResolvedValue({ allowed: true })
    const req = createPostRequest({
      customerId: 'cust-1',
      startDate: '2026-06-05',
      endDate: '2026-06-01',
      equipment: [{ equipmentId: 'eq-1', quantity: 1 }],
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 201 for valid request', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanCreate.mockResolvedValue({ allowed: true })
    const created = { id: 'quote-1', status: 'draft', customerId: 'cust-1' }
    mockCreate.mockResolvedValue(created)
    const req = createPostRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({ id: 'quote-1' })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        equipment: [{ equipmentId: 'eq-1', quantity: 1 }],
      }),
      'user-1',
      expect.any(Object)
    )
  })
})
