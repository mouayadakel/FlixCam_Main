/**
 * @file integrations/__tests__/whatsapp.test.ts
 * @description Tests for WhatsApp client (validation and formatting functions)
 *              These tests don't require API keys - they test utility functions.
 * @module integrations/whatsapp
 * @author Engineering Team
 * @created 2026-01-28
 */

import { WhatsAppClient } from '../whatsapp/client'

describe('WhatsApp Client', () => {
  describe('validatePhoneNumber', () => {
    it('should validate Saudi phone numbers', () => {
      expect(WhatsAppClient.validatePhoneNumber('+966501234567')).toBe(true)
      expect(WhatsAppClient.validatePhoneNumber('966501234567')).toBe(true)
      expect(WhatsAppClient.validatePhoneNumber('0501234567')).toBe(true)
    })

    it('should validate international phone numbers', () => {
      expect(WhatsAppClient.validatePhoneNumber('+12345678901')).toBe(true)
      expect(WhatsAppClient.validatePhoneNumber('1234567890')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(WhatsAppClient.validatePhoneNumber('123')).toBe(false)
      expect(WhatsAppClient.validatePhoneNumber('')).toBe(false)
      expect(WhatsAppClient.validatePhoneNumber('abc')).toBe(false)
      expect(WhatsAppClient.validatePhoneNumber('1234567890123456')).toBe(false) // Too long
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format Saudi phone numbers with country code', () => {
      expect(WhatsAppClient.formatPhoneNumber('0501234567')).toBe('966501234567')
      expect(WhatsAppClient.formatPhoneNumber('501234567')).toBe('966501234567')
    })

    it('should keep already formatted numbers', () => {
      expect(WhatsAppClient.formatPhoneNumber('966501234567')).toBe('966501234567')
      expect(WhatsAppClient.formatPhoneNumber('+966501234567')).toBe('966501234567')
    })

    it('should remove non-digit characters', () => {
      expect(WhatsAppClient.formatPhoneNumber('+966-50-123-4567')).toBe('966501234567')
      expect(WhatsAppClient.formatPhoneNumber('(966) 50 123 4567')).toBe('966501234567')
    })
  })
})
