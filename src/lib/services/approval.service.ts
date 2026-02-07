/**
 * @file approval.service.ts
 * @description Approval workflow service
 * @module lib/services/approval
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { UserRole, NotificationChannel } from '@prisma/client'

export interface CreateApprovalRequestInput {
  action: string
  resourceType: string
  resourceId: string
  requestedBy: string
  reason: string
  metadata?: Record<string, any>
  paymentId?: string
}

export interface ApproveRequestInput {
  approvalId: string
  approvedBy: string
  notes?: string
}

export interface RejectRequestInput {
  approvalId: string
  rejectedBy: string
  reason: string
}

export class ApprovalService {
  /**
   * Create an approval request
   */
  static async request(input: CreateApprovalRequestInput) {
    // Check if approval already exists for this resource and action
    const existing = await prisma.approvalRequest.findFirst({
      where: {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: 'pending',
        deletedAt: null,
      },
    })

    if (existing) {
      throw new ValidationError('Approval request already exists for this resource')
    }

    const approval = await prisma.approvalRequest.create({
      data: {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        requestedBy: input.requestedBy,
        reason: input.reason,
        metadata: input.metadata || {},
        paymentId: input.paymentId,
        createdBy: input.requestedBy,
      },
    })

    await AuditService.log({
      action: 'approval.requested',
      userId: input.requestedBy,
      resourceType: 'approval',
      resourceId: approval.id,
      metadata: {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    })

    // Send notification to approvers
    const { NotificationService } = await import('./notification.service')
    await NotificationService.sendTemplate(
      'approval.requested',
      undefined, // Will be sent to approvers
      {
        approvalId: approval.id,
        action: input.action,
        resourceType: input.resourceType,
      },
      [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    )

    return approval
  }

  /**
   * Approve a request
   */
  static async approve(input: ApproveRequestInput) {
    const approval = await prisma.approvalRequest.findFirst({
      where: {
        id: input.approvalId,
        deletedAt: null,
      },
    })

    if (!approval) {
      throw new NotFoundError('Approval request not found')
    }

    if (approval.status !== 'pending') {
      throw new ValidationError('Approval request is not pending')
    }

    // Check permission to approve
    const canApprove = await hasPermission(input.approvedBy, 'approval.approve' as any)
    if (!canApprove) {
      throw new ForbiddenError('You do not have permission to approve requests')
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: input.approvalId },
      data: {
        status: 'approved',
        approvedBy: input.approvedBy,
        metadata: {
          ...(approval.metadata as Record<string, any> || {}),
          approvedNotes: input.notes,
          approvedAt: new Date().toISOString(),
        },
        updatedBy: input.approvedBy,
      },
    })

    await AuditService.log({
      action: 'approval.approved',
      userId: input.approvedBy,
      resourceType: 'approval',
      resourceId: approval.id,
      metadata: {
        originalRequestedBy: approval.requestedBy,
        notes: input.notes,
      },
    })

    // Notify requester
    const { NotificationService } = await import('./notification.service')
    await NotificationService.sendTemplate(
      'approval.approved',
      approval.requestedBy,
      {
        approvalId: approval.id,
        action: approval.action,
      },
      [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    )

    return updated
  }

  /**
   * Reject a request
   */
  static async reject(input: RejectRequestInput) {
    const approval = await prisma.approvalRequest.findFirst({
      where: {
        id: input.approvalId,
        deletedAt: null,
      },
    })

    if (!approval) {
      throw new NotFoundError('Approval request not found')
    }

    if (approval.status !== 'pending') {
      throw new ValidationError('Approval request is not pending')
    }

    // Check permission to reject
    const canApprove = await hasPermission(input.rejectedBy, 'approval.approve' as any)
    if (!canApprove) {
      throw new ForbiddenError('You do not have permission to reject requests')
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: input.approvalId },
      data: {
        status: 'rejected',
        approvedBy: input.rejectedBy, // Using approvedBy field for rejector
        metadata: {
          ...(approval.metadata as Record<string, any> || {}),
          rejectionReason: input.reason,
          rejectedAt: new Date().toISOString(),
        },
        updatedBy: input.rejectedBy,
      },
    })

    await AuditService.log({
      action: 'approval.rejected',
      userId: input.rejectedBy,
      resourceType: 'approval',
      resourceId: approval.id,
      metadata: {
        originalRequestedBy: approval.requestedBy,
        reason: input.reason,
      },
    })

    // Notify requester
    const { NotificationService } = await import('./notification.service')
    await NotificationService.sendTemplate(
      'approval.rejected',
      approval.requestedBy,
      {
        approvalId: approval.id,
        action: approval.action,
        reason: input.reason,
      },
      [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    )

    return updated
  }

  /**
   * Get approval by ID
   */
  static async getById(approvalId: string) {
    return prisma.approvalRequest.findFirst({
      where: {
        id: approvalId,
        deletedAt: null,
      },
    })
  }

  /**
   * Get pending approvals
   */
  static async getPending(userId?: string) {
    return prisma.approvalRequest.findMany({
      where: {
        status: 'pending',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        payment: {
          include: {
            booking: {
              include: {
                customer: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  /**
   * Get approvals for a resource
   */
  static async getByResource(
    resourceType: string,
    resourceId: string
  ) {
    return prisma.approvalRequest.findMany({
      where: {
        resourceType,
        resourceId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
