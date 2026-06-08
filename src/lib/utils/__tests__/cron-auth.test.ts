import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'

function mockRequest(
  headers: Record<string, string> = {},
  query = ''
): NextRequest {
  const url = `https://example.com/api/cron/test${query}`
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
    nextUrl: new URL(url),
  } as unknown as NextRequest
}

describe('verifyCronSecret', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-value'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('accepts Bearer token with timing-safe comparison', () => {
    expect(verifyCronSecret(mockRequest({ authorization: 'Bearer test-secret-value' }))).toBe(true)
    expect(verifyCronSecret(mockRequest({ authorization: 'Bearer wrong-secret-value' }))).toBe(false)
  })

  it('accepts x-cron-secret header', () => {
    expect(verifyCronSecret(mockRequest({ 'x-cron-secret': 'test-secret-value' }))).toBe(true)
  })

  it('accepts query secret when enabled', () => {
    expect(
      verifyCronSecret(mockRequest({}, '?secret=test-secret-value'), { allowQuerySecret: true })
    ).toBe(true)
    expect(verifyCronSecret(mockRequest({}, '?secret=test-secret-value'))).toBe(false)
  })

  it('rejects when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET
    expect(verifyCronSecret(mockRequest({ authorization: 'Bearer test-secret-value' }))).toBe(false)
  })

  it('uses timingSafeEqual for equal-length secrets', () => {
    const spy = jest.spyOn(require('crypto'), 'timingSafeEqual')
    verifyCronSecret(mockRequest({ authorization: 'Bearer test-secret-value' }))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
