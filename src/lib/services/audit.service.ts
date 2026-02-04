/**
 * @file audit.service.ts
 * @description Audit logging service
 * @module lib/services/audit
 */

import { prisma } from '@/lib/db/prisma'

export interface AuditLogInput {
  action: string
  userId?: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(input: AuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata || {},
        timestamp: new Date(),
      },
    })
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(filters: {
    userId?: string
    resourceType?: string
    resourceId?: string
    action?: string
    limit?: number
    offset?: number
  }) {
    return prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        resourceType: filters.resourceType,
        resourceId: filters.resourceId,
        action: filters.action,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })
  }
}
