/**
 * Integration tests for GET/POST /api/bookings
 * Mocks auth and BookingService; tests 401, 400, 200/201.
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/services/booking.service', () => ({
  BookingService: {
    list: jest.fn(),
    create: jest.fn(),
  },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { GET, POST } from '@/app/api/bookings/route'

const mockAuth = auth as jest.Mock
const mockList = BookingService.list as jest.Mock
const mockCreate = BookingService.create as jest.Mock

function createGetRequest(url = 'http://localhost/api/bookings') {
  return new NextRequest(url)
}

function createPostRequest(body: object) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('غير مصرح')
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 200 with list when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockList.mockResolvedValue({ items: [], total: 0 })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('items')
    expect(data).toHaveProperty('total')
    expect(mockList).toHaveBeenCalledWith('user-1', expect.any(Object))
  })
})

describe('POST /api/bookings', () => {
  const validBody = {
    customerId: 'cust-1',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    equipmentIds: ['eq-1'],
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
    const req = createPostRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (endDate before startDate)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createPostRequest({
      customerId: 'cust-1',
      startDate: '2026-06-05',
      endDate: '2026-06-01',
      equipmentIds: ['eq-1'],
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 201 for valid request', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const created = { id: 'bk-1', status: 'DRAFT', customerId: 'cust-1' }
    mockCreate.mockResolvedValue(created)
    const req = createPostRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('bk-1')
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
