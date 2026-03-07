/**
 * @file route.ts
 * @description Custom signout route: return JSON for automation; delegate to NextAuth otherwise
 * @module app/api/auth/signout
 */

import { NextRequest, NextResponse } from 'next/server'
import { handlers, signOut } from '@/lib/auth'

const ENABLE_JSON_SIGNOUT =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_AUTH === 'true'

/**
 * POST: if JSON preferred (Accept or Content-Type), call signOut and return JSON; else delegate.
 */
export async function POST(request: NextRequest) {
  const accept = request.headers.get('accept') ?? ''
  const contentType = request.headers.get('content-type') ?? ''
  const wantsJson = accept.includes('application/json') || contentType.includes('application/json')

  if (ENABLE_JSON_SIGNOUT && wantsJson) {
    await signOut({ redirect: false })
    return NextResponse.json({ ok: true })
  }

  return handlers.POST(request)
}
