/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/auth/auth-helpers.ts
 * FEATURE: Authentication helpers
 * UNITS: hashPassword, verifyPassword
 * ═══════════════════════════════════════════════════════
 */

import { hashPassword, verifyPassword } from '@/lib/auth/auth-helpers'

// ─────────────────────────────────────
// UNIT: hashPassword
// REQUIREMENTS:
//   - Returns a bcrypt hash (12 rounds) of the password.
//   - Return value is a string, different from plain password.
// ─────────────────────────────────────

describe('hashPassword', () => {
  it('returns a hash string different from the plain password', async () => {
    // Arrange
    const password = 'SecureP@ssw0rd'

    // Act
    const hash = await hashPassword(password)

    // Assert
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(20)
    expect(hash.startsWith('$2')).toBe(true) // bcrypt prefix
  })

  it('produces different hashes for same password each time due to salt', async () => {
    // Arrange
    const password = 'SamePassword'

    // Act
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    // Assert
    expect(hash1).not.toBe(hash2)
  })

  it('accepts empty string password', async () => {
    // Act
    const hash = await hashPassword('')

    // Assert
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────
// UNIT: verifyPassword
// REQUIREMENTS:
//   - Returns true when password matches hash.
//   - Returns false when password does not match hash.
// ─────────────────────────────────────

describe('verifyPassword', () => {
  it('returns true when password matches the hash', async () => {
    // Arrange
    const password = 'CorrectPassword'
    const hash = await hashPassword(password)

    // Act
    const result = await verifyPassword(password, hash)

    // Assert
    expect(result).toBe(true)
  })

  it('returns false when password does not match the hash', async () => {
    // Arrange
    const hash = await hashPassword('RealPassword')

    // Act
    const result = await verifyPassword('WrongPassword', hash)

    // Assert
    expect(result).toBe(false)
  })

  it('returns false when hash is empty string', async () => {
    // Act
    const result = await verifyPassword('any', '')

    // Assert
    expect(result).toBe(false)
  })
})
