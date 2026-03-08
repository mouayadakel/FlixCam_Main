/**
 * Unit tests for auth.validator
 */

import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../auth.validator'

describe('auth.validator', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid',
        password: 'Password1',
      })
      expect(result.success).toBe(false)
    })
    it('rejects short password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(true)
    })
  })

  describe('resetPasswordSchema', () => {
    it('accepts matching password and confirm', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPass1',
        confirmPassword: 'NewPass1',
        token: 'reset-token',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewPass1',
        confirmPassword: 'OtherPass1',
        token: 'reset-token',
      })
      expect(result.success).toBe(false)
    })
    it('rejects weak password (no upper/lower/digit)', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'alllowercase1',
        confirmPassword: 'alllowercase1',
        token: 'reset-token',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('sendOtpSchema', () => {
    it('accepts Saudi phone and normalizes', () => {
      const result = sendOtpSchema.safeParse({ phone: '501234567' })
      expect(result.success).toBe(true)
    })
    it('rejects invalid phone', () => {
      const result = sendOtpSchema.safeParse({ phone: '123' })
      expect(result.success).toBe(false)
    })
  })

  describe('verifyOtpSchema', () => {
    it('accepts phone and 6-digit code', () => {
      const result = verifyOtpSchema.safeParse({ phone: '966501234567', code: '123456' })
      expect(result.success).toBe(true)
    })
    it('rejects code not 6 chars', () => {
      const result = verifyOtpSchema.safeParse({ phone: '966501234567', code: '12345' })
      expect(result.success).toBe(false)
    })
  })
})
