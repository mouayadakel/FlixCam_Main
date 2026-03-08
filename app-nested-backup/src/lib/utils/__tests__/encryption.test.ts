/**
 * Unit tests for encryption.ts
 * REQUIREMENTS: encrypt produces IV:hex format; decrypt reverses it; isEncrypted detects format; decrypt returns as-is when no colon.
 */

import { encrypt, decrypt, isEncrypted } from '../encryption'

const originalEnv = process.env

describe('encryption', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv, NODE_ENV: 'test' }
    process.env.ENCRYPTION_KEY = undefined
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encrypt', () => {
    it('returns string in IV:hex format', () => {
      const result = encrypt('secret')
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/)
    })

    it('produces different ciphertext each time (random IV)', () => {
      const a = encrypt('same')
      const b = encrypt('same')
      expect(a).not.toBe(b)
      expect(decrypt(a)).toBe('same')
      expect(decrypt(b)).toBe('same')
    })
  })

  describe('decrypt', () => {
    it('decrypts to original plaintext', () => {
      const plain = 'hello world'
      const enc = encrypt(plain)
      expect(decrypt(enc)).toBe(plain)
    })

    it('returns input as-is when no colon (invalid format)', () => {
      const invalid = 'not-encrypted'
      expect(decrypt(invalid)).toBe(invalid)
    })
  })

  describe('isEncrypted', () => {
    it('returns true for IV:ciphertext format', () => {
      const enc = encrypt('x')
      expect(isEncrypted(enc)).toBe(true)
    })

    it('returns false for plain text', () => {
      expect(isEncrypted('plain')).toBe(false)
    })

    it('returns true for 32 hex chars followed by colon', () => {
      expect(isEncrypted('a'.repeat(32) + ':anything')).toBe(true)
    })
  })

  describe('getEncryptionKey production', () => {
    it('throws when NODE_ENV is production and ENCRYPTION_KEY is missing', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
      process.env.ENCRYPTION_KEY = ''
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be set in production')
    })

    it('throws when NODE_ENV is production and ENCRYPTION_KEY is too short', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
      process.env.ENCRYPTION_KEY = 'short'
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be set in production')
    })

    it('uses ENCRYPTION_KEY when production and key is valid (>=32 chars)', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
      process.env.ENCRYPTION_KEY = 'a'.repeat(32)
      const enc = encrypt('secret')
      expect(decrypt(enc)).toBe('secret')
    })
  })

  describe('getEncryptionKey non-production', () => {
    it('uses default key when ENCRYPTION_KEY is not set', () => {
      process.env.ENCRYPTION_KEY = undefined
      const enc = encrypt('x')
      expect(decrypt(enc)).toBe('x')
    })

    it('uses ENCRYPTION_KEY when set in non-production', () => {
      process.env.ENCRYPTION_KEY = 'my-custom-key-at-least-32-chars!!'
      const enc = encrypt('data')
      expect(decrypt(enc)).toBe('data')
    })
  })

  describe('decrypt invalid format', () => {
    it('returns input as-is when single part (no colon)', () => {
      expect(decrypt('nocolon')).toBe('nocolon')
    })
  })
})
