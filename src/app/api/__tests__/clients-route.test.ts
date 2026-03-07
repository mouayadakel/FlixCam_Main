/**
 * Phase 10: Integration tests for GET /api/clients
 * Tests auth requirement and policy enforcement.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/services/client.service', () => ({
  ClientService: { list: jest.fn() },
}))
jest.mock('@/lib/policies/client.policy', () => ({
  ClientPolicy: { canView: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ClientService } from '@/lib/services/client.service'
import { ClientPolicy } from '@/lib/policies/client.policy'
import { GET } from '@/app/api/clients/route'

const mockAuth = auth as jest.Mock
const mockList = ClientService.list as jest.Mock
const mockCanView = ClientPolicy.canView as jest.Mock

function createGetRequest(url = 'http://localhost/api/clients') {
  return new NextRequest(url)
}

describe('GET /api/clients', () => {
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
    expect(mockCanView).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mockCanView).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 403 when policy denies', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanView.mockResolvedValue({ allowed: false, reason: 'Missing permission' })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Missing permission')
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 200 with list when authenticated and policy allows', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanView.mockResolvedValue({ allowed: true })
    mockList.mockResolvedValue({ clients: [], total: 0, page: 1, pageSize: 20 })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('total')
    expect(mockList).toHaveBeenCalled()
  })
})
