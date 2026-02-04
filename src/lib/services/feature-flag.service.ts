/**
 * @file feature-flag.service.ts
 * @description Feature flag management service
 * @module lib/services/feature-flag
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { FeatureFlagScope } from '@prisma/client'

export interface CreateFeatureFlagInput {
  name: string
  description?: string
  enabled?: boolean
  scope: FeatureFlagScope
  requiresApproval?: boolean
  userId: string
}

export interface UpdateFeatureFlagInput {
  enabled?: boolean
  description?: string
  requiresApproval?: boolean
  userId: string
}

export class FeatureFlagService {
  /**
   * Get all feature flags
   */
  static async getAll() {
    return prisma.featureFlag.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [
        { scope: 'asc' },
        { name: 'asc' },
      ],
    })
  }

  /**
   * Get feature flag by ID
   */
  static async getById(id: string) {
    return prisma.featureFlag.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  /**
   * Get feature flag by name
   */
  static async getByName(name: string) {
    return prisma.featureFlag.findFirst({
      where: {
        name,
        deletedAt: null,
      },
    })
  }

  /**
   * Check if a feature flag is enabled
   */
  static async isEnabled(name: string): Promise<boolean> {
    const flag = await this.getByName(name)
    return flag?.enabled ?? false
  }

  /**
   * Create a new feature flag
   */
  static async create(input: CreateFeatureFlagInput) {
    const flag = await prisma.featureFlag.create({
      data: {
        name: input.name,
        description: input.description,
        enabled: input.enabled ?? false,
        scope: input.scope,
        requiresApproval: input.requiresApproval ?? false,
        createdBy: input.userId,
      },
    })

    await AuditService.log({
      action: 'feature_flag.created',
      userId: input.userId,
      resourceType: 'feature_flag',
      resourceId: flag.id,
      metadata: {
        name: flag.name,
        scope: flag.scope,
      },
    })

    return flag
  }

  /**
   * Update a feature flag
   */
  static async update(id: string, input: UpdateFeatureFlagInput) {
    const existing = await prisma.featureFlag.findUnique({
      where: { id },
    })

    if (!existing || existing.deletedAt) {
      throw new Error('Feature flag not found')
    }

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
        description: input.description !== undefined ? input.description : existing.description,
        requiresApproval: input.requiresApproval !== undefined ? input.requiresApproval : existing.requiresApproval,
        updatedBy: input.userId,
      },
    })

    await AuditService.log({
      action: 'feature_flag.updated',
      userId: input.userId,
      resourceType: 'feature_flag',
      resourceId: flag.id,
      metadata: {
        name: flag.name,
        changes: {
          enabled: input.enabled !== undefined ? { from: existing.enabled, to: input.enabled } : undefined,
          description: input.description !== undefined ? { from: existing.description, to: input.description } : undefined,
          requiresApproval: input.requiresApproval !== undefined ? { from: existing.requiresApproval, to: input.requiresApproval } : undefined,
        },
      },
    })

    return flag
  }

  /**
   * Toggle a feature flag
   */
  static async toggle(id: string, userId: string) {
    const existing = await prisma.featureFlag.findUnique({
      where: { id },
    })

    if (!existing || existing.deletedAt) {
      throw new Error('Feature flag not found')
    }

    if (existing.requiresApproval) {
      throw new Error('This feature flag requires approval before toggling')
    }

    return this.update(id, {
      enabled: !existing.enabled,
      userId,
    })
  }

  /**
   * Delete a feature flag (soft delete)
   */
  static async delete(id: string, userId: string) {
    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    await AuditService.log({
      action: 'feature_flag.deleted',
      userId,
      resourceType: 'feature_flag',
      resourceId: flag.id,
      metadata: {
        name: flag.name,
      },
    })

    return flag
  }

  /**
   * Get flags grouped by scope
   */
  static async getByScope(scope: FeatureFlagScope) {
    return prisma.featureFlag.findMany({
      where: {
        scope,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    })
  }
}
