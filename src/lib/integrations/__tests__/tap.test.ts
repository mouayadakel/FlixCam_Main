/**
 * @file integrations/__tests__/tap.test.ts
 * @description Tests for Tap payment client (webhook verification and parsing)
 *              These tests don't require API keys - they test utility functions.
 * @module integrations/tap
 * @author Engineering Team
 * @created 2026-01-28
 */

import { TapClient } from '../tap/client'
import * as crypto from 'crypto'

describe('Tap Client', () => {
  const apiKey = 'test_api_key'
  const webhookSecret = 'test_webhook_secret'
  let tapClient: TapClient

  beforeEach(() => {
    tapClient = new TapClient(apiKey, webhookSecret)
  })

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'charge.succeeded', object: { id: '123' } })
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(payload).digest('hex')

      const isValid = tapClient.verifyWebhook(digest, payload)

      expect(isValid).toBe(true)
    })

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ type: 'charge.succeeded', object: { id: '123' } })
      const invalidSignature = 'invalid_signature'

      const isValid = tapClient.verifyWebhook(invalidSignature, payload)

      expect(isValid).toBe(false)
    })

    it('should reject null signature', () => {
      const payload = JSON.stringify({ type: 'charge.succeeded' })

      const isValid = tapClient.verifyWebhook(null, payload)

      expect(isValid).toBe(false)
    })

    it('should handle empty payload', () => {
      const payload = ''
      const hmac = crypto.createHmac('sha256', webhookSecret)
      const digest = hmac.update(payload).digest('hex')

      const isValid = tapClient.verifyWebhook(digest, payload)

      expect(isValid).toBe(true)
    })
  })

  describe('parseWebhookEvent', () => {
    it('should parse valid webhook payload', () => {
      const payload = JSON.stringify({
        type: 'charge.succeeded',
        object: {
          id: 'charge_123',
          amount: 10000,
          currency: 'SAR',
          status: 'CAPTURED',
          metadata: { booking_id: 'booking_123' },
        },
      })

      const event = tapClient.parseWebhookEvent(payload)

      expect(event.type).toBe('charge.succeeded')
      expect(event.object.id).toBe('charge_123')
      expect(event.object.amount).toBe(10000)
      expect(event.object.metadata.booking_id).toBe('booking_123')
    })

    it('should throw error for invalid JSON', () => {
      const payload = 'invalid json'

      expect(() => {
        tapClient.parseWebhookEvent(payload)
      }).toThrow('Invalid webhook payload')
    })

    it('should handle different event types', () => {
      const successPayload = JSON.stringify({
        type: 'charge.succeeded',
        object: { id: '123' },
      })
      const failedPayload = JSON.stringify({
        type: 'charge.failed',
        object: { id: '123' },
      })
      const cancelledPayload = JSON.stringify({
        type: 'charge.cancelled',
        object: { id: '123' },
      })

      expect(tapClient.parseWebhookEvent(successPayload).type).toBe('charge.succeeded')
      expect(tapClient.parseWebhookEvent(failedPayload).type).toBe('charge.failed')
      expect(tapClient.parseWebhookEvent(cancelledPayload).type).toBe('charge.cancelled')
    })
  })
})
