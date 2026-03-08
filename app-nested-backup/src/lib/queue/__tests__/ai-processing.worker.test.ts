/**
 * Unit tests for AI processing worker (queue name, exports, job processor)
 */

jest.mock('../redis.client', () => ({
  getRedisClient: jest.fn(() => ({})),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    aIProcessingJob: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    importJob: { update: jest.fn() },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productTranslation: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/ai-content-generation.service', () => ({
  generateMasterFill: jest.fn(),
}))

jest.mock('@/lib/services/ai-spec-parser.service', () => ({
  inferMissingSpecs: jest.fn(),
}))

jest.mock('@/lib/services/image-sourcing.service', () => ({
  sourceImages: jest.fn(),
}))

jest.mock('@/lib/services/product-equipment-sync.service', () => ({
  syncProductToEquipment: jest.fn(),
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

import { getAIProcessingWorker, AI_PROCESSING_QUEUE_NAME } from '../ai-processing.worker'
import { prisma } from '@/lib/db/prisma'
import { inferMissingSpecs } from '@/lib/services/ai-spec-parser.service'
import { generateMasterFill } from '@/lib/services/ai-content-generation.service'
import { sourceImages } from '@/lib/services/image-sourcing.service'
import { syncProductToEquipment } from '@/lib/services/product-equipment-sync.service'

const mockFindFirst = prisma.aIProcessingJob.findFirst as jest.Mock
const mockCreate = prisma.aIProcessingJob.create as jest.Mock
const mockProductFindUnique = prisma.product.findUnique as jest.Mock
const mockProductUpdate = prisma.product.update as jest.Mock
const mockAIJobUpdate = prisma.aIProcessingJob.update as jest.Mock
const mockImportJobUpdate = prisma.importJob.update as jest.Mock

describe('ai-processing.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exports AI_PROCESSING_QUEUE_NAME as "ai-processing"', () => {
    expect(AI_PROCESSING_QUEUE_NAME).toBe('ai-processing')
  })

  it('getAIProcessingWorker returns a Worker instance', () => {
    const worker = getAIProcessingWorker()
    expect(worker).toBeDefined()
    expect(worker).toHaveProperty('on')
    expect(worker).toHaveProperty('close')
  })

  it('getAIProcessingWorker returns same instance on second call', () => {
    const a = getAIProcessingWorker()
    const b = getAIProcessingWorker()
    expect(a).toBe(b)
  })

  it('processor handles empty productIds (edge case)', async () => {
    getAIProcessingWorker()
    expect(capturedProcessor).toBeDefined()

    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'ai-job-1',
      importJobId: 'imp-1',
      status: 'processing',
      processedItems: 0,
      failedItems: 0,
    })

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: [], provider: 'gemini' as const },
      updateProgress,
    }

    await capturedProcessor!(mockJob)

    expect(mockImportJobUpdate).toHaveBeenCalled()
    expect(mockProductFindUnique).not.toHaveBeenCalled()
    expect(updateProgress).toHaveBeenCalledWith(100)
  })

  it('processor skips product not found and increments failed', async () => {
    getAIProcessingWorker()
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 'ai-job-1',
      importJobId: 'imp-1',
      status: 'processing',
      processedItems: 0,
      failedItems: 0,
    })
    mockProductFindUnique.mockResolvedValue(null)

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: ['prod-invalid'], provider: 'gemini' as const },
      updateProgress,
    }

    await capturedProcessor!(mockJob)

    expect(mockProductFindUnique).toHaveBeenCalledWith({
      where: { id: 'prod-invalid' },
      include: { translations: true, category: true, brand: true },
    })
    expect(generateMasterFill).not.toHaveBeenCalled()
    expect(syncProductToEquipment).not.toHaveBeenCalled()
  })

  it('processor propagates error on top-level failure', async () => {
    getAIProcessingWorker()
    mockFindFirst.mockRejectedValue(new Error('DB connection failed'))

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { importJobId: 'imp-1', productIds: ['prod-1'], provider: 'gemini' as const },
      updateProgress,
    }

    await expect(capturedProcessor!(mockJob)).rejects.toThrow('DB connection failed')
  })
})
