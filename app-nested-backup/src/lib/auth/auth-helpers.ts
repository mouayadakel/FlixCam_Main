/**
 * @file auth-helpers.ts
 * @description Password hashing/verification. Auth uses NextAuth — see lib/auth/config.ts
 * @module lib/auth
 */

import * as bcrypt from 'bcryptjs'

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
