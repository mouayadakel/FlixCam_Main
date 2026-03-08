/**
 * Unit tests for import.service
 * PATHS: createJob (validation, success); getJob; markProcessing; appendRows; markRow; bumpProgress; markComplete; markFailed
 */

import { ImportService } from '../import.service'
import { prisma } from '@/lib/db/prisma'
import { ValidationError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    importJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    importJobRow: {
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

const mockCreate = prisma.importJob.create as jest.Mock
const mockFindUnique = prisma.importJob.findUnique as jest.Mock
const mockUpdate = prisma.importJob.update as jest.Mock
const mockRowCreateMany = prisma.importJobRow.createMany as jest.Mock
const mockRowUpdateMany = prisma.importJobRow.updateMany as jest.Mock

describe('ImportService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('createJob', () => {
    it('throws ValidationError when filename is empty', async () => {
      await expect(
        ImportService.createJob({ filename: '', mimeType: 'text/csv' })
      ).rejects.toThrow(ValidationError)
    })

    it('creates job and returns it', async () => {
      mockCreate.mockResolvedValue({ id: 'j1', filename: 'test.csv', status: 'PENDING' })
      const result = await ImportService.createJob({ filename: 'test.csv', mimeType: 'text/csv' })
      expect(result).toMatchObject({ id: 'j1', filename: 'test.csv', status: 'PENDING' })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ filename: 'test.csv', mimeType: 'text/csv', status: 'PENDING' }),
        })
      )
    })
  })

  describe('getJob', () => {
    it('returns job with rows', async () => {
      mockFindUnique.mockResolvedValue({ id: 'j1', rows: [] })
      const result = await ImportService.getJob('j1')
      expect(result).toMatchObject({ id: 'j1' })
      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'j1' }, include: { rows: expect.any(Object) } })
      )
    })
  })

  describe('markProcessing', () => {
    it('updates job status to PROCESSING', async () => {
      mockUpdate.mockResolvedValue({})
      await ImportService.markProcessing('j1')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'PROCESSING' },
      })
    })
  })

  describe('appendRows', () => {
    it('does nothing when rows empty', async () => {
      await ImportService.appendRows('j1', [])
      expect(mockRowCreateMany).not.toHaveBeenCalled()
    })

    it('creates rows and increments totalRows', async () => {
      mockRowCreateMany.mockResolvedValue({})
      mockUpdate.mockResolvedValue({})
      await ImportService.appendRows('j1', [{ rowNumber: 1, payload: { a: 1 } }])
      expect(mockRowCreateMany).toHaveBeenCalledTimes(1)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { totalRows: { increment: 1 } },
      })
    })
  })

  describe('markRow', () => {
    it('updates row status', async () => {
      mockRowUpdateMany.mockResolvedValue({})
      await ImportService.markRow('j1', 1, 'SUCCESS', { productId: 'p1' })
      expect(mockRowUpdateMany).toHaveBeenCalledWith({
        where: { jobId: 'j1', rowNumber: 1 },
        data: expect.objectContaining({ status: 'SUCCESS', productId: 'p1' }),
      })
    })
  })

  describe('bumpProgress', () => {
    it('increments processed, success, error counts', async () => {
      mockUpdate.mockResolvedValue({})
      await ImportService.bumpProgress('j1', 5, 4, 1)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: {
          processedRows: { increment: 5 },
          successRows: { increment: 4 },
          errorRows: { increment: 1 },
        },
      })
    })
  })

  describe('markComplete', () => {
    it('updates status to COMPLETED', async () => {
      mockUpdate.mockResolvedValue({})
      await ImportService.markComplete('j1')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'COMPLETED' },
      })
    })
  })

  describe('markFailed', () => {
    it('updates status and errorMessage', async () => {
      mockUpdate.mockResolvedValue({})
      await ImportService.markFailed('j1', 'Import failed')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'j1' },
        data: { status: 'FAILED', errorMessage: 'Import failed' },
      })
    })
  })
})
