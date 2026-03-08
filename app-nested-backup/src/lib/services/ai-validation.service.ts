/**
 * @file ai-validation.service.ts
 * @description Post-fill field completeness validation with auto-retry scheduling.
 * Checks all AI-generated fields against quality rules and schedules
 * targeted re-fills for failed fields.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export interface ValidationCheck {
  field: string
  status: 'pass' | 'missing' | 'too_short' | 'too_long' | 'too_few' | 'placeholder'
  value?: string | number
  expected?: string
}

export interface ValidationReport {
  productId: string
  productName: string
  score: number
  checks: ValidationCheck[]
  issues: string[]
  passCount: number
  totalChecks: number
}

/**
 * Validate AI fill completeness for a product.
 * Returns a score (0-100) and list of issues.
 */
export async function validateAiFill(productId: string): Promise<ValidationReport> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { translations: true, brand: true, category: true },
  })

  if (!product) {
    return {
      productId,
      productName: 'Not found',
      score: 0,
      checks: [],
      issues: ['Product not found'],
      passCount: 0,
      totalChecks: 0,
    }
  }

  const en = product.translations.find((t) => t.locale === 'en')
  const ar = product.translations.find((t) => t.locale === 'ar')
  const zh = product.translations.find((t) => t.locale === 'zh')
  const productName = en?.name || product.sku || productId

  const checks: ValidationCheck[] = []

  function checkString(
    field: string,
    value: string | null | undefined,
    minLen: number,
    maxLen?: number
  ) {
    if (!value || value.trim() === '') {
      checks.push({ field, status: 'missing' })
      return
    }
    if (value.length < minLen) {
      checks.push({ field, status: 'too_short', value: value.length, expected: `>= ${minLen}` })
      return
    }
    if (maxLen && value.length > maxLen) {
      checks.push({ field, status: 'too_long', value: value.length, expected: `<= ${maxLen}` })
      return
    }
    checks.push({ field, status: 'pass' })
  }

  function checkNotPlaceholder(field: string, value: string | null | undefined) {
    if (!value || value === '/images/placeholder.jpg' || value === '') {
      checks.push({ field, status: 'placeholder' })
      return
    }
    checks.push({ field, status: 'pass' })
  }

  // English content
  checkString('short_desc_en', en?.shortDescription, 20)
  checkString('long_desc_en', en?.longDescription, 150)
  checkString('seo_title_en', en?.seoTitle, 40, 65)
  checkString('seo_desc_en', en?.seoDescription, 140, 165)
  checkString('seo_keywords_en', en?.seoKeywords, 10)

  // Arabic content
  checkString('name_ar', ar?.name, 3)
  checkString('short_desc_ar', ar?.shortDescription, 10)
  checkString('long_desc_ar', ar?.longDescription, 100)
  checkString('seo_title_ar', ar?.seoTitle, 10)

  // Chinese content
  checkString('name_zh', zh?.name, 2)
  checkString('short_desc_zh', zh?.shortDescription, 5)

  // Specs
  const specs = (en?.specifications as Record<string, unknown>) ?? {}
  const specKeyCount = Object.keys(specs).length
  if (specKeyCount < 3) {
    checks.push({
      field: 'specifications',
      status: specKeyCount === 0 ? 'missing' : 'too_few',
      value: specKeyCount,
      expected: '>= 3',
    })
  } else {
    checks.push({ field: 'specifications', status: 'pass' })
  }

  // Tags
  const tagStr = product.tags ?? ''
  const tagCount = tagStr ? tagStr.split(',').filter((t) => t.trim()).length : 0
  if (tagCount < 10) {
    checks.push({
      field: 'tags',
      status: tagCount === 0 ? 'missing' : 'too_few',
      value: tagCount,
      expected: '>= 10',
    })
  } else {
    checks.push({ field: 'tags', status: 'pass' })
  }

  // Photos
  checkNotPlaceholder('featured_image', product.featuredImage)

  // Brand
  if (!product.brandId) {
    checks.push({ field: 'brand', status: 'missing' })
  } else {
    checks.push({ field: 'brand', status: 'pass' })
  }

  const passCount = checks.filter((c) => c.status === 'pass').length
  const totalChecks = checks.length
  const score = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0

  const issues = checks
    .filter((c) => c.status !== 'pass')
    .map((c) => {
      const detail = c.value !== undefined ? ` (${c.value})` : ''
      const exp = c.expected ? ` expected ${c.expected}` : ''
      return `${c.status.toUpperCase()}: ${c.field}${detail}${exp}`
    })

  return {
    productId,
    productName,
    score,
    checks,
    issues,
    passCount,
    totalChecks,
  }
}

/**
 * Schedule a partial re-fill for fields that failed validation.
 * Queues an AI processing job with only the failed product.
 */
export async function schedulePartialRefill(
  productId: string,
  issues: string[]
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })
  if (!product) return false

  await prisma.product.update({
    where: { id: productId },
    data: {
      needsAiReview: true,
      aiReviewReason: `Validation failed: ${issues.slice(0, 5).join('; ')}`,
    },
  })

  try {
    const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
    const importJob = await prisma.importJob.findFirst({
      where: {
        rows: { some: { productId } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (importJob) {
      await addAIProcessingJob(importJob.id, [productId])
      console.info(
        `[AI Validation] Scheduled partial refill for ${productId}: ${issues.length} issues`
      )
      return true
    }
  } catch (err) {
    console.warn(
      '[AI Validation] Could not queue partial refill:',
      err instanceof Error ? err.message : String(err)
    )
  }
  return false
}

/**
 * Validate and auto-retry if score is below threshold.
 */
export async function validateAndRetry(
  productId: string,
  threshold: number = 80
): Promise<ValidationReport> {
  const report = await validateAiFill(productId)

  if (report.score < threshold && report.issues.length > 0) {
    const aiRunCount = await prisma.product.findUnique({
      where: { id: productId },
      select: { aiRunCount: true },
    })

    if ((aiRunCount?.aiRunCount ?? 0) < 3) {
      await schedulePartialRefill(productId, report.issues)
    } else {
      console.warn(
        `[AI Validation] Product ${productId} failed validation (score: ${report.score}%) but max retries reached`
      )
    }
  }

  return report
}

/**
 * Bulk validate all products and return aggregate statistics.
 */
export async function validateAllProducts(options?: {
  limit?: number
  offset?: number
  onlyMissing?: string
}): Promise<{
  total: number
  complete: number
  partial: number
  failed: number
  averageScore: number
  reports: ValidationReport[]
}> {
  const where: Record<string, unknown> = { deletedAt: null }

  const products = await prisma.product.findMany({
    where,
    select: { id: true },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
    orderBy: { createdAt: 'desc' },
  })

  const reports: ValidationReport[] = []
  for (const p of products) {
    reports.push(await validateAiFill(p.id))
  }

  const complete = reports.filter((r) => r.score >= 90).length
  const partial = reports.filter((r) => r.score >= 50 && r.score < 90).length
  const failed = reports.filter((r) => r.score < 50).length
  const averageScore =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
      : 0

  return {
    total: reports.length,
    complete,
    partial,
    failed,
    averageScore,
    reports,
  }
}
