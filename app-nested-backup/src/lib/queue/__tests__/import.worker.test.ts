/**
 * Unit tests for import worker (queue name, exports, job processor)
 */

import { IMPORT_QUEUE_NAME } from '../import.queue'

jest.mock('../redis.client', () => ({
  getRedisClient: jest.fn(() => ({})),
}))

jest.mock('@/lib/services/import-worker', () => ({
  processImportJob: jest.fn(),
}))

let capturedProcessor: ((job: { data: unknown; updateProgress: (n: number) => Promise<void> }) => Promise<unknown>) | null = null

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    capturedProcessor = processor as typeof capturedProcessor
    return {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    }
  }),
}))

import { getImportWorker } from '../import.worker'
import { processImportJob } from '@/lib/services/import-worker'

const mockProcessImportJob = processImportJob as jest.Mock

describe('import.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exports IMPORT_QUEUE_NAME as "product-import"', () => {
    expect(IMPORT_QUEUE_NAME).toBe('product-import')
  })

  it('getImportWorker returns a Worker instance', () => {
    const worker = getImportWorker()
    expect(worker).toBeDefined()
    expect(worker).toHaveProperty('on')
    expect(worker).toHaveProperty('close')
  })

  it('getImportWorker returns same instance on second call', () => {
    const a = getImportWorker()
    const b = getImportWorker()
    expect(a).toBe(b)
  })

  it('processor calls processImportJob with jobId and approvedSuggestions (happy path)', async () => {
    getImportWorker()
    expect(capturedProcessor).toBeDefined()

    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = {
      data: { jobId: 'job-123', approvedSuggestions: [{ sheetName: 'Sheet1', excelRowNumber: 1, aiSuggestions: {} }] },
      updateProgress,
    }

    mockProcessImportJob.mockResolvedValue(undefined)

    await capturedProcessor!(mockJob)

    expect(mockProcessImportJob).toHaveBeenCalledWith('job-123', {
      approvedSuggestions: [{ sheetName: 'Sheet1', excelRowNumber: 1, aiSuggestions: {} }],
    })
    expect(updateProgress).toHaveBeenCalledWith(0)
    expect(updateProgress).toHaveBeenCalledWith(100)
  })

  it('processor handles empty payload (jobId only)', async () => {
    getImportWorker()
    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = { data: { jobId: 'job-456' }, updateProgress }

    mockProcessImportJob.mockResolvedValue(undefined)

    await capturedProcessor!(mockJob)

    expect(mockProcessImportJob).toHaveBeenCalledWith('job-456', { approvedSuggestions: undefined })
  })

  it('processor throws and propagates error on processImportJob failure', async () => {
    getImportWorker()
    const updateProgress = jest.fn().mockResolvedValue(undefined)
    const mockJob = { data: { jobId: 'job-789' }, updateProgress }

    mockProcessImportJob.mockRejectedValue(new Error('Import failed'))

    await expect(capturedProcessor!(mockJob)).rejects.toThrow('Import failed')
    expect(updateProgress).toHaveBeenCalledWith(0)
    expect(updateProgress).not.toHaveBeenCalledWith(100)
  })
})
