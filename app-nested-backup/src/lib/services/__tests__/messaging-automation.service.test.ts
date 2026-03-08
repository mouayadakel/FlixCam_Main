/**
 * Unit tests for messaging-automation.service
 */
import { processEventForMessaging } from '../messaging-automation.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: { automationRule: { findMany: jest.fn() } },
}))
jest.mock('../notification.service', () => ({ NotificationService: { send: jest.fn() } }))
jest.mock('../notification-queue.service', () => ({ enqueueNotification: jest.fn() }))
jest.mock('../template-renderer.service', () => ({ renderTemplate: jest.fn().mockResolvedValue('rendered') }))

describe('messaging-automation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.automationRule.findMany as jest.Mock).mockResolvedValue([])
  })

  it('processEventForMessaging returns early when trigger not mapped', async () => {
    await processEventForMessaging('unknown.event', {})
    expect(prisma.automationRule.findMany).not.toHaveBeenCalled()
  })

  it('processEventForMessaging finds rules for known event', async () => {
    await processEventForMessaging('booking.confirmed', { bookingId: 'b1' })
    expect(prisma.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trigger: 'BOOKING_CONFIRMED', isActive: true } })
    )
  })
})
