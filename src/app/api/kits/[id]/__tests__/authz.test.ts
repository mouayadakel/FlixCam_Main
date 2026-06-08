/**
 * Regression test: kit deletion must require kit.delete. An authenticated but
 * non-privileged user must receive 403.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))

jest.mock('@/lib/auth/permissions', () => ({
  ...jest.requireActual('@/lib/auth/permissions'),
  hasPermission: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: { kit: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() }, $transaction: jest.fn() },
}))

import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { DELETE, PATCH } from '@/app/api/kits/[id]/route'
import { POST } from '@/app/api/kits/route'

const mockAuth = auth as jest.Mock
const mockHasPermission = hasPermission as jest.Mock

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/kits', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as any
}

describe('kit mutation authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'user-customer', role: 'CUSTOMER' } })
    mockHasPermission.mockResolvedValue(false)
  })

  it('DELETE returns 403 for non-privileged user', async () => {
    const res = await DELETE(new Request('http://localhost') as any, {
      params: Promise.resolve({ id: 'kit-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('PATCH returns 403 for non-privileged user', async () => {
    const res = await PATCH(jsonReq({ name: 'X' }), { params: Promise.resolve({ id: 'kit-1' }) })
    expect(res.status).toBe(403)
  })

  it('POST returns 403 for non-privileged user', async () => {
    const res = await POST(jsonReq({ name: 'X', slug: 'x', items: [] }))
    expect(res.status).toBe(403)
  })
})
