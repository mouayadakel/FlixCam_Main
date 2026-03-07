/**
 * Integration tests for POST /api/auth/otp/verify
 * Mocks cache, prisma, rate limit, bcrypt; tests 400, 200.
 */

jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDelete: jest.fn(),
}))

jest.mock('@/lib/utils/rate-limit-upstash', () => ({
  checkRateLimitUpstash: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn((val: string) => Promise.resolve(`hashed_${val}`)),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn((n: number) => ({ toString: () => 'token123' })),
}))

import { NextRequest } from 'next/server'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { POST } from '@/app/api/auth/otp/verify/route'

const mockCacheGet = cacheGet as jest.Mock
const mockCacheSet = cacheSet as jest.Mock
const mockCacheDelete = cacheDelete as jest.Mock
const mockRateLimit = checkRateLimitUpstash as jest.Mock
const mockFindFirst = prisma.user.findFirst as jest.Mock
const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockCreate = prisma.user.create as jest.Mock

function createPostRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/otp/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue({ allowed: true })
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false })
    const req = createPostRequest({ phone: '966501234567', code: '123456' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(mockCacheGet).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (not JSON)', async () => {
    const req = new NextRequest('http://localhost/api/auth/otp/verify', {
      method: 'POST',
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid body')
  })

  it('returns 400 for invalid input (missing code)', async () => {
    const req = createPostRequest({ phone: '966501234567' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 when OTP code does not match', async () => {
    mockCacheGet.mockResolvedValue({ code: '999999' })
    const req = createPostRequest({ phone: '966501234567', code: '123456' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('رمز')
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('returns 400 when OTP not found in cache', async () => {
    mockCacheGet.mockResolvedValue(null)
    const req = createPostRequest({ phone: '966501234567', code: '123456' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with oneTimeToken when existing user', async () => {
    mockCacheGet.mockResolvedValue({ code: '123456' })
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      name: 'User',
      phone: '966501234567',
    })
    mockFindUnique.mockResolvedValue(null)
    const req = createPostRequest({ phone: '966501234567', code: '123456' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.oneTimeToken).toBe('token123')
    expect(data.user).toMatchObject({ id: 'user-1', phone: '966501234567' })
    expect(mockCacheDelete).toHaveBeenCalledWith('otp', '966501234567')
    expect(mockCacheSet).toHaveBeenCalledWith('authToken', 'token123', 'user-1')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 200 and creates user when new phone', async () => {
    mockCacheGet.mockResolvedValue({ code: '123456' })
    mockFindFirst.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'user-new',
      email: 'phone_966501234567@guest.flixcam.rent',
      phone: '966501234567',
      name: null,
    })
    const req = createPostRequest({ phone: '966501234567', code: '123456' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.oneTimeToken).toBe('token123')
    expect(data.user.id).toBe('user-new')
    expect(mockCreate).toHaveBeenCalled()
  })
})
