/**
 * @file route.ts
 * @description Custom signin route: JSON API for TestSprite/automation; delegates form/GET to NextAuth
 * @module app/api/auth/signin
 */

import { NextRequest, NextResponse } from 'next/server'
import { handlers, signIn, auth } from '@/lib/auth'

const ENABLE_JSON_SIGNIN =
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_TEST_AUTH === 'true'

function getCredentialsFromBasic(request: NextRequest): {
  email: string
  password: string
} | null {
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('basic ')) return null
  try {
    const base64 = authHeader.slice(6).trim()
    const decoded = Buffer.from(base64, 'base64').toString('utf8')
    const colon = decoded.indexOf(':')
    if (colon === -1) return null
    const email = decoded.slice(0, colon).trim()
    const password = decoded.slice(colon + 1)
    if (!email || !password) return null
    return { email, password }
  } catch {
    return null
  }
}

/**
 * POST with application/json or Authorization: Basic: validate credentials and return JSON + set session cookie.
 * GET or POST form: delegate to NextAuth (login page / form signin).
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  let email: string | undefined
  let password: string | undefined

  if (ENABLE_JSON_SIGNIN && contentType.includes('application/json')) {
    try {
      const body = await request.json()
      const cred = body.credential ?? body
      email = (cred.email ?? cred.username ?? body.email ?? body.username) as
        | string
        | undefined
      password = (cred.password ?? body.password) as string | undefined
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
  } else if (
    ENABLE_JSON_SIGNIN &&
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    try {
      const form = await request.formData()
      email = (form.get('email') ?? form.get('username')) as string | undefined
      password = form.get('password') as string | undefined
    } catch {
      return NextResponse.json(
        { error: 'Invalid form body' },
        { status: 400 }
      )
    }
  } else if (ENABLE_JSON_SIGNIN) {
    const basic = getCredentialsFromBasic(request)
    if (basic) {
      email = basic.email
      password = basic.password
    }
  }

  if (ENABLE_JSON_SIGNIN && email && password) {
    try {
      const redirectUrl = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (typeof redirectUrl === 'string' && redirectUrl.includes('error=')) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      const session = await auth()
      return NextResponse.json({
        ok: true,
        session: session
          ? {
              user: {
                id: session.user?.id,
                email: session.user?.email,
                name: session.user?.name,
                role: (session.user as { role?: string })?.role,
              },
            }
          : null,
      })
    } catch {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  }

  return handlers.POST(request)
}

/**
 * GET /api/auth/signin: delegate to NextAuth (sign-in page).
 */
export async function GET(request: NextRequest) {
  return handlers.GET(request)
}
