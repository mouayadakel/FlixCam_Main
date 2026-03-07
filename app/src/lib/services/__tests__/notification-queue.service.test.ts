/**
 * Unit tests for notification-queue.service
 */
import { enqueueNotification, getQueueStats } from '../notification-queue.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messagingChannelConfig: { findUnique: jest.fn().mockResolvedValue({ isEnabled: true }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}))
jest.mock('../email.service', () => ({ EmailService: { send: jest.fn().mockResolvedValue({ ok: true }) } }))
jest.mock('../sms.service', () => ({ SmsService: { sendSmsText: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('../whatsapp.service', () => ({ WhatsAppService: { sendWhatsAppText: jest.fn().mockResolvedValue(undefined) } }))

describe('notification-queue.service', () => {
  it('enqueueNotification returns string id', () => {
    const id = enqueueNotification({ channel: 'email', recipient: 'u@t.com', body: 'Hi', subject: 'S' })
    expect(typeof id).toBe('string')
    expect(id.startsWith('notif_')).toBe(true)
  })
  it('getQueueStats returns pending and priority counts', () => {
    const stats = getQueueStats()
    expect(stats).toHaveProperty('pending')
    expect(stats).toHaveProperty('highPriority')
    expect(typeof stats.pending).toBe('number')
  })
})
