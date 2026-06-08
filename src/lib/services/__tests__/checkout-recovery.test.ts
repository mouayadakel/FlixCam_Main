/**
 * @file checkout-recovery.test.ts
 * @description Unit tests for CheckoutRecoveryService
 * @module lib/services/__tests__/checkout-recovery.test
 */

import { CheckoutRecoveryService } from '../checkout-recovery.service'
import { prisma } from '@/lib/db/prisma'
import { WhatsAppService } from '../whatsapp.service'
import { AuditService } from '../audit.service'
import { EventBus } from '@/lib/events/event-bus'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    cart: {
      findMany: jest.fn(),
      update: jest.fn(),
    }
  }
}))

jest.mock('../whatsapp.service', () => ({
  WhatsAppService: {
    normalizePhoneForWhatsApp: jest.fn((p) => `whatsapp:${p}`),
    isWhatsAppConfigured: jest.fn(() => true),
    sendWhatsAppText: jest.fn(() => Promise.resolve({ ok: true, messageId: 'msg123' })),
  }
}))

jest.mock('../audit.service', () => ({
  AuditService: {
    log: jest.fn(() => Promise.resolve()),
  }
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: {
    emit: jest.fn(() => Promise.resolve()),
  }
}))

describe('CheckoutRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process abandoned carts correctly and send WhatsApp messages', async () => {
    const mockCart = {
      id: 'cart-123',
      userId: 'user-456',
      user: {
        id: 'user-456',
        name: 'John Doe',
        phone: '966500000000',
        email: 'john@example.com',
      },
      items: [
        {
          equipmentId: 'eq-789',
          equipment: {
            model: 'Sony FX3',
          }
        }
      ]
    };

    (prisma.cart.findMany as jest.Mock).mockResolvedValue([mockCart]);
    (prisma.cart.update as jest.Mock).mockResolvedValue({});

    const result = await CheckoutRecoveryService.recoverAbandonedCheckouts()

    expect(prisma.cart.findMany).toHaveBeenCalled()
    expect(WhatsAppService.sendWhatsAppText).toHaveBeenCalledWith(
      'whatsapp:966500000000',
      expect.stringContaining('John Doe'),
      expect.objectContaining({
        recipientUserId: 'user-456',
        templateId: 'abandoned_cart_recovery',
      })
    )
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-123' },
      data: { abandonedCheckoutEmailSentAt: expect.any(Date) },
    })
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cart.recovery_sent',
        userId: 'user-456',
      })
    )
    expect(EventBus.emit).toHaveBeenCalledWith('cart.abandoned', {
      cartId: 'cart-123',
      userId: 'user-456',
      equipmentIds: ['eq-789'],
    })

    expect(result.processed).toBe(1)
    expect(result.failures).toBe(0)
  })

  it('should skip carts with no phone number', async () => {
    const mockCart = {
      id: 'cart-123',
      userId: 'user-456',
      user: {
        id: 'user-456',
        name: 'John Doe',
        phone: null,
      },
      items: []
    };

    (prisma.cart.findMany as jest.Mock).mockResolvedValue([mockCart]);

    const result = await CheckoutRecoveryService.recoverAbandonedCheckouts()

    expect(WhatsAppService.sendWhatsAppText).not.toHaveBeenCalled()
    expect(result.processed).toBe(0)
  })
})
