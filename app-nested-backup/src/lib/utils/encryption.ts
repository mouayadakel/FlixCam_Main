/**
 * @file encryption.ts
 * @description Shared AES-256-CBC encryption/decryption utilities
 * @module lib/utils/encryption
 */

import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (process.env.NODE_ENV === 'production') {
    if (!key || key.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be set in production and at least 32 characters (see .env.example)'
      )
    }
    return key
  }
  if (!key) {
    return 'default-key-change-in-production!'
  }
  return key
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key.slice(0, 32), 'utf8'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const parts = encryptedText.split(':')
  if (parts.length < 2) return encryptedText
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts.slice(1).join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key.slice(0, 32), 'utf8'), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Check if a string appears to be an encrypted value (IV:ciphertext format)
 */
export function isEncrypted(value: string): boolean {
  return /^[0-9a-f]{32}:/.test(value)
}
