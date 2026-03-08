/**
 * Unit tests for approval.service
 * PATHS: request (existing → ValidationError, create → audit + notify + return); approve (not found, not pending, no permission, success); reject (same); getById; getPending; getByResource
 */

import { ApprovalService } from '../approval.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    approvalRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('@/lib/services/notification.service', () => ({
  NotificationService: { sendTemplate: jest.fn().mockResolvedValue(undefined) },
}))

const mockFindFirst = prisma.approvalRequest.findFirst as jest.Mock
const mockFindMany = prisma.approvalRequest.findMany as jest.Mock
const mockCreate = prisma.approvalRequest.create as jest.Mock
const mockUpdate = prisma.approvalRequest.update as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('ApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
  })

  describe('request', () => {
    it('throws ValidationError when pending approval already exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'existing', status: 'pending' })
      await expect(
        ApprovalService.request({
          action: 'payment.refund',
          resourceType: 'payment',
          resourceId: 'pay-1',
          requestedBy: 'u1',
          reason: 'Refund',
        })
      ).rejects.toThrow(ValidationError)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates approval and returns when no existing', async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'approval-1',
        action: 'payment.refund',
        resourceType: 'payment',
        resourceId: 'pay-1',
        requestedBy: 'u1',
        reason: 'Refund',
        status: 'pending',
      })
      const result = await ApprovalService.request({
        action: 'payment.refund',
        resourceType: 'payment',
        resourceId: 'pay-1',
        requestedBy: 'u1',
        reason: 'Refund',
      })
      expect(result.id).toBe('approval-1')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'payment.refund',
            resourceType: 'payment',
            resourceId: 'pay-1',
            requestedBy: 'u1',
            reason: 'Refund',
          }),
        })
      )
    })
  })

  describe('approve', () => {
    it('throws NotFoundError when approval not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        ApprovalService.approve({ approvalId: 'missing', approvedBy: 'u1' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when status is not pending', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'approved', requestedBy: 'u1' })
      await expect(
        ApprovalService.approve({ approvalId: 'a1', approvedBy: 'u1' })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'pending', requestedBy: 'u1', metadata: {} })
      hasPermission.mockResolvedValue(false)
      await expect(
        ApprovalService.approve({ approvalId: 'a1', approvedBy: 'u1' })
      ).rejects.toThrow(ForbiddenError)
    })

    it('updates and returns approval when valid', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'pending', requestedBy: 'u1', metadata: {} })
      mockUpdate.mockResolvedValue({ id: 'a1', status: 'approved' })
      const result = await ApprovalService.approve({ approvalId: 'a1', approvedBy: 'u1' })
      expect(result.status).toBe('approved')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: expect.objectContaining({ status: 'approved', approvedBy: 'u1' }),
        })
      )
    })
  })

  describe('reject', () => {
    it('throws NotFoundError when approval not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        ApprovalService.reject({ approvalId: 'missing', rejectedBy: 'u1', reason: 'No' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when status is not pending', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'approved', requestedBy: 'u1' })
      await expect(
        ApprovalService.reject({ approvalId: 'a1', rejectedBy: 'u1', reason: 'No' })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'pending', requestedBy: 'u1', metadata: {} })
      hasPermission.mockResolvedValue(false)
      await expect(
        ApprovalService.reject({ approvalId: 'a1', rejectedBy: 'u1', reason: 'No' })
      ).rejects.toThrow(ForbiddenError)
    })

    it('updates and returns when valid', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'pending', requestedBy: 'u1', metadata: {} })
      mockUpdate.mockResolvedValue({ id: 'a1', status: 'rejected' })
      const result = await ApprovalService.reject({ approvalId: 'a1', rejectedBy: 'u1', reason: 'Not valid' })
      expect(result.status).toBe('rejected')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: expect.objectContaining({
            status: 'rejected',
            approvedBy: 'u1',
            metadata: expect.objectContaining({ rejectionReason: 'Not valid' }),
          }),
        })
      )
    })
  })

  describe('getById', () => {
    it('returns approval when found', async () => {
      mockFindFirst.mockResolvedValue({ id: 'a1', status: 'pending' })
      const result = await ApprovalService.getById('a1')
      expect(result).toMatchObject({ id: 'a1', status: 'pending' })
    })
  })

  describe('getPending', () => {
    it('returns findMany result', async () => {
      mockFindMany.mockResolvedValue([{ id: 'a1' }])
      const result = await ApprovalService.getPending()
      expect(result).toHaveLength(1)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending', deletedAt: null } })
      )
    })
  })

  describe('getByResource', () => {
    it('returns findMany for resourceType and resourceId', async () => {
      mockFindMany.mockResolvedValue([])
      await ApprovalService.getByResource('payment', 'pay-1')
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resourceType: 'payment', resourceId: 'pay-1', deletedAt: null },
        })
      )
    })
  })
})
