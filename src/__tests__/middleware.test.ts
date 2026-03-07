/**
 * Unit tests for middleware
 */
const mockGetToken = jest.fn()
const mockEnforceReadOnly = jest.fn()
jest.mock('next-auth/jwt', () => ({ getToken: mockGetToken }))
jest.mock('@/lib/middleware/read-only-edge', () => ({ enforceReadOnly: mockEnforceReadOnly }))

import middleware from '../middleware'
import { NextRequest } from 'next/server'

function createRequest(pathname: string, method = 'GET', origin?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  return new NextRequest(url, { method, headers })
}

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetToken.mockResolvedValue(null)
    mockEnforceReadOnly.mockResolvedValue(null)
  })

  it('allows public route /', async () => {
    const req = createRequest('/')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows public route /login', async () => {
    const req = createRequest('/login')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('returns 401 for protected API without session', async () => {
    const req = createRequest('/api/bookings')
    const res = await middleware(req)
    expect(res.status).toBe(401)
  })

  it('allows public API /api/health without session', async () => {
    const req = createRequest('/api/health')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects to login for /admin when no session', async () => {
    const req = createRequest('/admin/dashboard')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('returns 401 for /api/payments without session', async () => {
    const req = createRequest('/api/payments')
    const res = await middleware(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('allows /api/public/* without session', async () => {
    const req = createRequest('/api/public/equipment')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows /api/public/faq without session', async () => {
    const req = createRequest('/api/public/faq')
    const res = await middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects to login for /vendor when no session', async () => {
    const req = createRequest('/vendor/dashboard')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects to login for /admin routes when no session', async () => {
    const req = createRequest('/admin/users')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get('location')).toContain('callbackUrl')
  })
})
