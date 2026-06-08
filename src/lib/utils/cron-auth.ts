import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Verify cron job authorization using timing-safe comparison.
 * Accepts Bearer token, raw Authorization value, x-cron-secret header, and optional ?secret= query param.
 */
export function verifyCronSecret(
  request: NextRequest,
  options?: { allowQuerySecret?: boolean }
): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const candidates: string[] = []

  const xCron = request.headers.get('x-cron-secret')
  if (xCron) candidates.push(xCron.trim())

  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    candidates.push(auth.slice(7).trim())
  } else if (auth) {
    candidates.push(auth.trim())
  }

  if (options?.allowQuerySecret) {
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (querySecret) candidates.push(querySecret)
  }

  return candidates.some((provided) => timingSafeEqualStrings(secret, provided))
}
