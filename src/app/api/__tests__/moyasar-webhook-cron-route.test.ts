import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/moyasar-webhooks/route'
import { MoyasarWebhookProcessorService } from '@/lib/services/moyasar-webhook-processor.service'

jest.mock('@/lib/services/moyasar-webhook-processor.service', () => ({
  MoyasarWebhookProcessorService: {
    processPending: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

const mockProcessPending = MoyasarWebhookProcessorService.processPending as jest.Mock

describe('GET /api/cron/moyasar-webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret'
  })

  it('returns unauthorized when cron secret is missing', async () => {
    delete process.env.CRON_SECRET
    const req = new NextRequest('http://localhost:3000/api/cron/moyasar-webhooks')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('processes queued events when authorized', async () => {
    mockProcessPending.mockResolvedValue({
      scanned: 10,
      processed: 8,
      retried: 2,
      failed: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/cron/moyasar-webhooks?limit=20', {
      headers: {
        authorization: 'Bearer cron-secret',
      },
    })

    const res = await GET(req)
    const payload = await res.json()
    expect(res.status).toBe(200)
    expect(mockProcessPending).toHaveBeenCalledWith(20)
    expect(payload).toEqual({
      ok: true,
      scanned: 10,
      processed: 8,
      retried: 2,
      failed: 0,
    })
  })
})
