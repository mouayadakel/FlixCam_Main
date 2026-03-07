/**
 * Integration tests for GET /api/contracts
 * Mocks auth, ContractPolicy, ContractService; tests 401, 200.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/services/contract.service', () => ({
  ContractService: { list: jest.fn() },
}))
jest.mock('@/lib/policies/contract.policy', () => ({
  ContractPolicy: { canView: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { ContractService } from '@/lib/services/contract.service'
import { ContractPolicy } from '@/lib/policies/contract.policy'
import { GET } from '@/app/api/contracts/route'

const mockAuth = auth as jest.Mock
const mockList = ContractService.list as jest.Mock
const mockCanView = ContractPolicy.canView as jest.Mock

function createGetRequest(url = 'http://localhost/api/contracts') {
  return new NextRequest(url)
}

describe('GET /api/contracts', () => {
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

  it('returns 200 with list when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanView.mockResolvedValue({ allowed: true })
    mockList.mockResolvedValue({ contracts: [], total: 0, page: 1, pageSize: 20 })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
    expect(mockList).toHaveBeenCalledWith('user-1', expect.any(Object))
  })
})
