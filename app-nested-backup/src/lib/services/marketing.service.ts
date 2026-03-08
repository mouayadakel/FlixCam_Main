/**
 * @file marketing.service.ts
 * @description Marketing service for campaign management
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 * @updated 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type {
  Campaign,
  CampaignType,
  CampaignStatus,
  CampaignCreateInput,
  CampaignUpdateInput,
} from '@/lib/types/marketing.types'
import {
  CampaignType as PrismaCampaignType,
  CampaignStatus as PrismaCampaignStatus,
} from '@prisma/client'

/**
 * Marketing Service
 * Uses the Campaign model for proper data storage.
 */
export class MarketingService {
  private static mapCampaignType(type: CampaignType): PrismaCampaignType {
    const m: Record<CampaignType, PrismaCampaignType> = {
      email: 'EMAIL',
      sms: 'SMS',
      push: 'PUSH',
      whatsapp: 'WHATSAPP',
    }
    return m[type] ?? 'EMAIL'
  }

  private static mapFromPrismaType(type: PrismaCampaignType): CampaignType {
    return type.toLowerCase() as CampaignType
  }

  private static mapCampaignStatus(status: CampaignStatus): PrismaCampaignStatus {
    const m: Record<CampaignStatus, PrismaCampaignStatus> = {
      draft: 'DRAFT',
      scheduled: 'SCHEDULED',
      active: 'ACTIVE',
      paused: 'PAUSED',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    }
    return m[status] ?? 'DRAFT'
  }

  private static mapFromPrismaStatus(status: PrismaCampaignStatus): CampaignStatus {
    return status.toLowerCase() as CampaignStatus
  }

  static async create(
    input: CampaignCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Campaign> {
    const canCreate = await hasPermission(userId, 'marketing.create' as any)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create campaigns')
    }

    const now = new Date()
    let status: PrismaCampaignStatus = 'DRAFT'
    if (input.scheduledAt) {
      status = input.scheduledAt > now ? 'SCHEDULED' : 'ACTIVE'
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: input.name,
        type: this.mapCampaignType(input.type),
        status,
        subject: input.subject ?? null,
        content: input.content,
        targetAudience: (input.targetAudience ?? null) as any,
        scheduledAt: input.scheduledAt ?? null,
        createdBy: userId,
      },
    })

    await AuditService.log({
      action: 'marketing.campaign.created',
      userId,
      resourceType: 'campaign',
      resourceId: campaign.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { campaignId: campaign.id, name: input.name, type: input.type },
    })

    await EventBus.emit('marketing.campaign.created', {
      campaignId: campaign.id,
      name: input.name,
      type: input.type,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToCampaign(campaign)
  }

  static async getById(id: string, userId: string): Promise<Campaign> {
    const canView = await hasPermission(userId, 'marketing.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view campaigns')
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, deletedAt: null },
    })

    if (!campaign) {
      throw new NotFoundError('Campaign', id)
    }

    return this.transformToCampaign(campaign)
  }

  static async list(
    userId: string,
    filters: {
      status?: CampaignStatus
      type?: CampaignType
      search?: string
      dateFrom?: Date
      dateTo?: Date
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ campaigns: Campaign[]; total: number; page: number; pageSize: number }> {
    const canView = await hasPermission(userId, 'marketing.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view campaigns')
    }

    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: any = { deletedAt: null }
    if (filters.status) where.status = this.mapCampaignStatus(filters.status)
    if (filters.type) where.type = this.mapCampaignType(filters.type)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ])

    return {
      campaigns: campaigns.map((c) => this.transformToCampaign(c)),
      total,
      page,
      pageSize,
    }
  }

  static async update(
    id: string,
    input: CampaignUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Campaign> {
    const canUpdate = await hasPermission(userId, 'marketing.update' as any)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update campaigns')
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, deletedAt: null },
    })

    if (!existing) {
      throw new NotFoundError('Campaign', id)
    }

    if (existing.sentAt) {
      throw new ValidationError('Cannot update sent campaign')
    }

    const now = new Date()
    let status: PrismaCampaignStatus | undefined
    if (input.status) {
      status = this.mapCampaignStatus(input.status)
    } else if (input.scheduledAt !== undefined) {
      const scheduledAt = input.scheduledAt ?? existing.scheduledAt
      status = scheduledAt ? (scheduledAt > now ? 'SCHEDULED' : 'ACTIVE') : 'DRAFT'
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type ? this.mapCampaignType(input.type) : undefined,
        subject: input.subject !== undefined ? input.subject : undefined,
        content: input.content !== undefined ? input.content : undefined,
        targetAudience:
          input.targetAudience !== undefined ? (input.targetAudience as any) : undefined,
        scheduledAt: input.scheduledAt,
        status,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'marketing.campaign.updated',
      userId,
      resourceType: 'campaign',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return this.transformToCampaign(updated)
  }

  static async send(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Campaign> {
    const canSend = await hasPermission(userId, 'marketing.send' as any)
    if (!canSend) {
      throw new ForbiddenError('You do not have permission to send campaigns')
    }

    const campaign = await this.getById(id, userId)
    if (campaign.status === 'completed') {
      throw new ValidationError('Campaign already sent')
    }
    if (campaign.status === 'cancelled') {
      throw new ValidationError('Cannot send cancelled campaign')
    }

    const targetUsers = await this.getTargetAudience(campaign.targetAudience ?? [])
    const sentCount = targetUsers.length

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        sentAt: new Date(),
        totalRecipients: sentCount,
        sentCount,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'marketing.campaign.sent',
      userId,
      resourceType: 'campaign',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { campaignId: id, recipients: sentCount },
    })

    await EventBus.emit('marketing.campaign.sent', {
      campaignId: id,
      recipients: sentCount,
      sentBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToCampaign(updated)
  }

  private static async getTargetAudience(targetAudience: string[]) {
    if (targetAudience.length === 0) {
      return prisma.user.findMany({
        where: { status: 'active', deletedAt: null },
        select: { id: true, email: true, name: true, phone: true },
      })
    }
    return prisma.user.findMany({
      where: { id: { in: targetAudience }, deletedAt: null },
      select: { id: true, email: true, name: true, phone: true },
    })
  }

  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const canDelete = await hasPermission(userId, 'marketing.delete' as any)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete campaigns')
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, deletedAt: null },
    })

    if (!campaign) {
      throw new NotFoundError('Campaign', id)
    }

    await prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })

    await AuditService.log({
      action: 'marketing.campaign.deleted',
      userId,
      resourceType: 'campaign',
      resourceId: id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })
  }

  private static transformToCampaign(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      type: this.mapFromPrismaType(row.type),
      status: this.mapFromPrismaStatus(row.status),
      subject: row.subject,
      content: row.content,
      targetAudience: row.targetAudience as string[] | null,
      scheduledAt: row.scheduledAt,
      sentAt: row.sentAt,
      totalRecipients: row.totalRecipients ?? 0,
      sentCount: row.sentCount ?? 0,
      openedCount: row.openedCount ?? 0,
      clickedCount: row.clickedCount ?? 0,
      conversionCount: row.conversionCount ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    }
  }
}
