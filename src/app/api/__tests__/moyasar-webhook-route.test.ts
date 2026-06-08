import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/moyasar/route'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { PaymentService } from '@/lib/services/payment.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/services/payment-gateway-config.service', () => ({
  PaymentGatewayConfigService: {
    getConfig: jest.fn(),
  },
}))

jest.mock('@/lib/services/payment.service', () => ({
  PaymentService: {
    handleGatewayWebhook: jest.fn(),
  },
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    event: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

const mockGetConfig = PaymentGatewayConfigService.getConfig as jest.Mock
const mockHandleGatewayWebhook = PaymentService.handleGatewayWebhook as jest.Mock
const mockEventFindFirst = prisma.event.findFirst as jest.Mock
const mockEventCreate = prisma.event.create as jest.Mock
const mockEventUpdate = prisma.event.update as jest.Mock

describe('POST /api/webhooks/moyasar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetConfig.mockResolvedValue({ webhookSecret: 'whsec_test' })
    mockEventFindFirst.mockResolvedValue(null)
    mockEventCreate.mockResolvedValue({ id: 'evt_1' })
    mockEventUpdate.mockResolvedValue({ id: 'evt_1', status: 'PROCESSED' })
    mockHandleGatewayWebhook.mockResolvedValue({ queueOutcome: 'PROCESSED' })
  })

  it('rejects webhook when secret does not match', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt_1',
        type: 'payment_paid',
        secret_token: 'wrong',
        data: { id: 'pay_1', amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Invalid secret')
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('fails closed when webhook secret is missing', async () => {
    const originalSecret = process.env.MOYASAR_WEBHOOK_SECRET
    delete process.env.MOYASAR_WEBHOOK_SECRET
    mockGetConfig.mockResolvedValue({})

    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt_1',
        type: 'payment_paid',
        secret_token: 'any',
        data: { id: 'pay_1', amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
    expect(mockEventCreate).not.toHaveBeenCalled()
    process.env.MOYASAR_WEBHOOK_SECRET = originalSecret
  })

  it('skips processing duplicate events', async () => {
    mockEventFindFirst.mockResolvedValue({ id: 'existing-event' })

    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt_1',
        type: 'payment_paid',
        secret_token: 'whsec_test',
        data: { id: 'pay_1', amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ received: true, duplicate: true, processed: false })
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('processes event inline after queueing it', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt_1',
        type: 'payment_paid',
        secret_token: 'whsec_test',
        data: { id: 'pay_1', amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    expect(mockHandleGatewayWebhook).toHaveBeenCalledWith(
      'moyasar',
      {
        type: 'payment_paid',
        bookingId: 'b1',
        amount: 1000,
        externalId: 'pay_1',
      },
      expect.objectContaining({ rawWebhook: expect.any(Object) })
    )
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventName: 'webhook.moyasar',
          resourceId: 'evt_1',
          payload: expect.objectContaining({
            eventType: 'payment_paid',
            bookingId: 'b1',
            amount: 1000,
            externalId: 'pay_1',
            attempts: 0,
          }),
        }),
      })
    )
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSED',
        }),
      })
    )
  })

  it('keeps the event queued when inline processing fails', async () => {
    mockHandleGatewayWebhook.mockRejectedValueOnce(new Error('temporary failure'))

    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt_1',
        type: 'payment_paid',
        secret_token: 'whsec_test',
        data: { id: 'pay_1', amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(202)
    expect(payload).toEqual({ received: true, processedInline: false, queued: true })
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      })
    )
  })

  it('rejects events with missing data.id (Zod)', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/moyasar', {
      method: 'POST',
      body: JSON.stringify({
        type: 'payment_paid',
        secret_token: 'whsec_test',
        data: { amount: 1000, metadata: { booking_id: 'b1' } },
      }),
    })

    const response = await POST(req)
    const payload = await response.json()
    expect(response.status).toBe(400)
    expect(payload.code).toBe('MOYASAR_WEBHOOK_VALIDATION')
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

})
