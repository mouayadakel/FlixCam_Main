/**
 * Regression tests: catalog category mutations must require the matching
 * permission. An authenticated but non-privileged user must receive 403.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))

jest.mock('@/lib/auth/permissions', () => ({
  ...jest.requireActual('@/lib/auth/permissions'),
  hasPermission: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/cache', () => ({ cacheDelete: jest.fn() }))

import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { POST } from '@/app/api/categories/route'
import { PATCH, DELETE } from '@/app/api/categories/[id]/route'

const mockAuth = auth as jest.Mock
const mockHasPermission = hasPermission as jest.Mock

const nonPrivilegedSession = { user: { id: 'user-customer', role: 'CUSTOMER' } }

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as any
}

describe('categories mutation authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(nonPrivilegedSession)
    mockHasPermission.mockResolvedValue(false)
  })

  it('POST /api/categories returns 403 for non-privileged user', async () => {
    const res = await POST(jsonRequest({ name: 'New Cat' }) as any)
    expect(res.status).toBe(403)
  })

  it('PATCH /api/categories/:id returns 403 for non-privileged user', async () => {
    const res = await PATCH(jsonRequest({ name: 'Renamed' }) as any, {
      params: Promise.resolve({ id: 'cat-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('DELETE /api/categories/:id returns 403 for non-privileged user', async () => {
    const res = await DELETE(new Request('http://localhost') as any, {
      params: Promise.resolve({ id: 'cat-1' }),
    })
    expect(res.status).toBe(403)
  })
})
