/**
 * @file ai-confidence.service.ts
 * @description Adaptive confidence scoring based on historical approval/rejection rates.
 * Replaces hardcoded confidence values with dynamic lookups per field/category/provider.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

interface ConfidenceResult {
  confidence: number
  totalSamples: number
  approvalRate: number
  source: 'historical' | 'default'
}

const DEFAULT_CONFIDENCE: Record<string, number> = {
  shortDescription: 85,
  longDescription: 82,
  seoTitle: 90,
  seoDescription: 88,
  seoKeywords: 85,
  boxContents: 78,
  tags: 80,
  specifications: 75,
  name_ar: 88,
  name_zh: 85,
}

const AUTO_APPROVE_MIN_SAMPLES = 50
const AUTO_APPROVE_THRESHOLD = 95

/**
 * Get confidence score for a specific field, optionally filtered by category and provider.
 * Uses historical approval data from AiFeedback if available, falls back to defaults.
 */
export async function getConfidence(
  fieldName: string,
  categoryId?: string | null,
  provider?: string | null
): Promise<ConfidenceResult> {
  try {
    const where: Record<string, unknown> = { fieldName }
    if (categoryId) where.categoryId = categoryId
    if (provider) where.provider = provider

    const [approved, total] = await Promise.all([
      prisma.aiFeedback.count({ where: { ...where, action: 'approved' } }),
      prisma.aiFeedback.count({ where }),
    ])

    if (total >= 5) {
      const approvalRate = (approved / total) * 100
      return {
        confidence: Math.round(approvalRate),
        totalSamples: total,
        approvalRate: Math.round(approvalRate * 10) / 10,
        source: 'historical',
      }
    }
  } catch {
    // Table may not exist yet
  }

  return {
    confidence: DEFAULT_CONFIDENCE[fieldName] ?? 75,
    totalSamples: 0,
    approvalRate: 0,
    source: 'default',
  }
}

/**
 * Get confidence scores for all common fields in bulk
 */
export async function getBulkConfidence(
  categoryId?: string | null,
  provider?: string | null
): Promise<Record<string, ConfidenceResult>> {
  const fields = Object.keys(DEFAULT_CONFIDENCE)
  const results: Record<string, ConfidenceResult> = {}

  for (const field of fields) {
    results[field] = await getConfidence(field, categoryId, provider)
  }

  return results
}

/**
 * Check if a content type + category qualifies for auto-approval
 */
export async function shouldAutoApprove(
  contentType: string,
  categoryId: string
): Promise<{ autoApprove: boolean; reason: string }> {
  try {
    const where = { contentType, categoryId }
    const [approved, total] = await Promise.all([
      prisma.aiFeedback.count({ where: { ...where, action: 'approved' } }),
      prisma.aiFeedback.count({ where }),
    ])

    if (total < AUTO_APPROVE_MIN_SAMPLES) {
      return {
        autoApprove: false,
        reason: `Insufficient samples: ${total}/${AUTO_APPROVE_MIN_SAMPLES}`,
      }
    }

    const rate = (approved / total) * 100
    if (rate >= AUTO_APPROVE_THRESHOLD) {
      const recentWhere = {
        ...where,
        action: 'rejected',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }
      const recentRejections = await prisma.aiFeedback.count({ where: recentWhere })
      const recentTotal = await prisma.aiFeedback.count({
        where: {
          ...where,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })

      if (recentTotal > 0 && (recentRejections / recentTotal) * 100 > 10) {
        return {
          autoApprove: false,
          reason: `Recent rejection spike: ${Math.round((recentRejections / recentTotal) * 100)}% in last 7 days`,
        }
      }

      return {
        autoApprove: true,
        reason: `Auto-approved: ${Math.round(rate)}% accuracy over ${total} samples`,
      }
    }

    return {
      autoApprove: false,
      reason: `Approval rate ${Math.round(rate)}% below threshold ${AUTO_APPROVE_THRESHOLD}%`,
    }
  } catch {
    return { autoApprove: false, reason: 'Feedback table not available' }
  }
}

/**
 * Log an AI feedback event (approval, rejection, or edit)
 */
export async function logFeedback(data: {
  draftId?: string
  contentType: string
  fieldName: string
  action: 'approved' | 'rejected' | 'edited'
  rejectionReason?: string
  originalValue?: string
  finalValue?: string
  provider?: string
  categoryId?: string
}): Promise<void> {
  try {
    await prisma.aiFeedback.create({
      data: {
        draftId: data.draftId,
        contentType: data.contentType,
        fieldName: data.fieldName,
        action: data.action,
        rejectionReason: data.rejectionReason,
        originalValue: data.originalValue?.slice(0, 5000),
        finalValue: data.finalValue?.slice(0, 5000),
        provider: data.provider,
        categoryId: data.categoryId,
      },
    })
  } catch {
    console.error('[AiConfidence] Failed to log feedback')
  }
}

/**
 * Get provider performance comparison for analytics dashboard
 */
export async function getProviderComparison(categoryId?: string): Promise<
  Array<{
    provider: string
    totalSamples: number
    approvalRate: number
    rejectionRate: number
    editRate: number
  }>
> {
  try {
    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId

    const providers = ['gemini', 'openai']
    const results = []

    for (const provider of providers) {
      const provWhere = { ...where, provider }
      const [total, approved, rejected, edited] = await Promise.all([
        prisma.aiFeedback.count({ where: provWhere }),
        prisma.aiFeedback.count({ where: { ...provWhere, action: 'approved' } }),
        prisma.aiFeedback.count({ where: { ...provWhere, action: 'rejected' } }),
        prisma.aiFeedback.count({ where: { ...provWhere, action: 'edited' } }),
      ])

      if (total > 0) {
        results.push({
          provider,
          totalSamples: total,
          approvalRate: Math.round((approved / total) * 100),
          rejectionRate: Math.round((rejected / total) * 100),
          editRate: Math.round((edited / total) * 100),
        })
      }
    }

    return results
  } catch {
    return []
  }
}
