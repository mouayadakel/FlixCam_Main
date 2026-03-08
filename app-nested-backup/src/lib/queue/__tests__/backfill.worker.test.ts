/**
 * Unit tests for backfill worker (queue name, exports, graceful shutdown flag)
 */

import { getBackfillWorker, BACKFILL_QUEUE_NAME } from '../backfill.worker'

jest.mock('../redis.client', () => ({
  getRedisClient: jest.fn(() => ({})),
}))

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}))

describe('backfill.worker', () => {
  it('exports BACKFILL_QUEUE_NAME as "backfill"', () => {
    expect(BACKFILL_QUEUE_NAME).toBe('backfill')
  })

  it('getBackfillWorker returns a Worker instance', () => {
    const worker = getBackfillWorker()
    expect(worker).toBeDefined()
    expect(worker).toHaveProperty('on')
    expect(worker).toHaveProperty('close')
  })

  it('getBackfillWorker returns same instance on second call', () => {
    const a = getBackfillWorker()
    const b = getBackfillWorker()
    expect(a).toBe(b)
  })
})
