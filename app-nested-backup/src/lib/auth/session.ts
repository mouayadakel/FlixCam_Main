/**
 * @file session.ts
 * @description Session helpers
 * @module lib/auth
 */

import { auth } from '@/lib/auth'
import { UnauthorizedError } from '@/lib/errors'

export interface SessionUser {
  id: string
  email: string
  name?: string
  role: string
}

export async function getSession() {
  return auth()
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()

  if (!session?.user) {
    throw new UnauthorizedError('You must be logged in')
  }

  return session.user as SessionUser
}
