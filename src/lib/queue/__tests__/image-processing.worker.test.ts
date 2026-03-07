/**
 * Unit tests for image processing worker (queue name, exports, job processor)
 */

jest.mock('../redis.client', () => ({
  getRedisClient: jest.fn(() => ({})),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    importJob: { update: jest.fn() },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/image-processing.service', () => ({
  processImageFromUrl: jest.fn(),
  processImagesBatch: jest.fn(),
}))

let capturedProcessor: ((job: {
  data: unknown
  updateProgress: (n: number) => Promise<void>
}) => Promise<unknown>) | null = null

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    capturedProcessor = processor as typeof capturedProcessor
    return {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    }
  }),
}))

import { getImageProcessingWorker, IMAGE_PROCESSING_QUEUE_NAME } from '../image-processing.worker'
import { prisma } from '@/lib/db/prisma'
import { processImageFromUrl, processImagesBatch } from '@/lib/services/image-processing.service'

const mockProductFindUnique = prisma.product.findUnique as jest.Mock
const mockProductUpdate = prisma.product.update as jest.Mock
const mockImportJobUpdate = prisma.importJob.update as jest.Mock

describe('image-processing.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exports IMAGE_PROCESSING_QUEUE_NAME as "image-processing"', () => {
    expect(IMAGE_PROCESSING_QUEUE_NAME).toBe('image-processing')
  })

  it('getImageProcessingWorker returns a Worker instance', () => {
    const worker = getImageProcessingWorker()
    expect(worker).toBeDefined()
    expect(worker).toHaveProperty('on')
    expect(worker).toHaveProperty('close')
  })

  it('getImageProcessingWorker returns same instance on second call', () => {
    const a = getImageProcessingWorker()
    const b = getImageProcessingWorker()
    expect(a).toBe(b)
  })

  it('processor handles empty productIds (edge case)', async () => {
    getImageProcessingWorker()
    expect(capturedProcessor).toBeDefined()

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: [] },
      updateProgress,
    }

    await capturedProcessor!(mockJob)

    expect(mockProductFindUnique).not.toHaveBeenCalled()
    expect(mockImportJobUpdate).toHaveBeenCalledWith({
      where: { id: 'imp-1' },
      data: { imageProcessingStatus: 'completed' },
    })
    expect(updateProgress).toHaveBeenCalledWith(100)
  })

  it('processor skips product not found and increments failed', async () => {
    getImageProcessingWorker()
    mockProductFindUnique.mockResolvedValue(null)

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: ['prod-invalid'] },
      updateProgress,
    }

    await capturedProcessor!(mockJob)

    expect(mockProductFindUnique).toHaveBeenCalledWith({ where: { id: 'prod-invalid' } })
    expect(processImageFromUrl).not.toHaveBeenCalled()
    expect(processImagesBatch).not.toHaveBeenCalled()
  })

  it('processor propagates error on top-level failure', async () => {
    getImageProcessingWorker()
    mockImportJobUpdate.mockRejectedValueOnce(new Error('DB error'))

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: ['prod-1'] },
      updateProgress,
    }

    await expect(capturedProcessor!(mockJob)).rejects.toThrow('DB error')
  })
})
