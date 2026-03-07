/**
 * @file ai-audit.service.ts
 * @description Audit logging for AI dashboard actions (backfill trigger, image approve/reject, settings)
 * @module lib/services
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export const AI_AUDIT_ACTIONS = {
  BACKFILL_TRIGGER: 'backfill.trigger',
  IMAGE_APPROVE: 'image.approve',
  IMAGE_REJECT: 'image.reject',
  SETTINGS_UPDATE: 'settings.update',
} as const

export type AiAuditAction = (typeof AI_AUDIT_ACTIONS)[keyof typeof AI_AUDIT_ACTIONS]

interface LogAiAuditInput {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an AI-related action for audit trail.
 * Non-blocking: errors are logged but do not throw.
 */
export async function logAiAudit(input: LogAiAuditInput): Promise<void> {
  try {
    await prisma.aiAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata != null ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
    })
  } catch (error) {
    console.error(
      '[ai-audit] Failed to write audit log:',
      error instanceof Error ? error.message : error
    )
  }
}
