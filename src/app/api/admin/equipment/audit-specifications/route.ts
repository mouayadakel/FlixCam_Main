/**
 * GET /api/admin/equipment/audit-specifications
 * Audit all equipment: specifications format (structured/flat/empty/invalid) and image presence.
 * Requires equipment.read permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { isStructuredSpecifications, isFlatSpecifications } from '@/lib/types/specifications.types'
import { resolveTemplateName, CATEGORY_SPEC_TEMPLATES } from '@/lib/ai/spec-templates'
import { detectSpecKeyCollisions } from '@/lib/utils/specifications.utils'

// ============================================================================
// Types
// ============================================================================

export interface EquipmentAuditItem {
  id: string
  sku: string
  model: string
  category: string
  status: 'complete' | 'flat' | 'missing' | 'invalid'
  specsFormat: 'structured' | 'flat' | 'empty' | 'invalid'
  hasSpecs: boolean
  hasImages: boolean
  imageCount: number
  hasNotesOnly: boolean
  hasEmptyGroups: boolean
  hasLowConfidence: boolean
  /** Shape / format problems (empty groups, unrecognized JSON, etc.) */
  validityIssues: string[]
  /** Recommendations: highlights, quick specs, sparse values, images, key collisions */
  qualityIssues: string[]
  /** Combined list for backward compatibility */
  issues: string[]
  editUrl: string
}

export interface AuditSummary {
  total: number
  complete: number
  needsConversion: number
  missingSpecs: number
  invalidSpecs: number
  missingImages: number
  percentComplete: number
}

export interface AuditResponse {
  success: boolean
  timestamp: string
  summary: AuditSummary
  equipment: EquipmentAuditItem[]
  categoryHintAudit: {
    totalCategories: number
    mappedToKnownTemplates: number
    unresolvedCount: number
    unresolved: Array<{
      categoryId: string
      name: string
      slug: string
      resolvedTemplate: string
    }>
  }
}

// ============================================================================
// Helper: analyze specifications
// ============================================================================

function analyzeSpecifications(specs: unknown): {
  format: EquipmentAuditItem['specsFormat']
  status: EquipmentAuditItem['status']
  hasNotesOnly: boolean
  hasEmptyGroups: boolean
  hasLowConfidence: boolean
  validityIssues: string[]
  qualityIssues: string[]
} {
  const validityIssues: string[] = []
  const qualityIssues: string[] = []
  let hasNotesOnly = false
  let hasEmptyGroups = false
  let hasLowConfidence = false

  if (!specs) {
    return {
      format: 'empty',
      status: 'missing',
      hasNotesOnly,
      hasEmptyGroups,
      hasLowConfidence: true,
      validityIssues: ['No specifications provided'],
      qualityIssues,
    }
  }

  if (typeof specs === 'object' && Object.keys(specs as object).length === 0) {
    return {
      format: 'empty',
      status: 'missing',
      hasNotesOnly,
      hasEmptyGroups,
      hasLowConfidence: true,
      validityIssues: ['Specifications object is empty'],
      qualityIssues,
    }
  }

  if (
    typeof specs === 'object' &&
    specs != null &&
    'notes' in (specs as Record<string, unknown>) &&
    Object.keys(specs as Record<string, unknown>).length <= 2
  ) {
    hasNotesOnly = true
    hasLowConfidence = true
    validityIssues.push('Notes-only specifications detected')
  }

  if (isStructuredSpecifications(specs)) {
    const s = specs as {
      groups?: Array<{ specs?: Array<{ value?: string }> }>
      highlights?: unknown[]
      quickSpecs?: unknown[]
    }
    if (!s.groups || s.groups.length === 0) {
      hasEmptyGroups = true
      hasLowConfidence = true
      validityIssues.push('Structured format but no specification groups')
      return {
        format: 'structured',
        status: 'invalid',
        hasNotesOnly,
        hasEmptyGroups,
        hasLowConfidence,
        validityIssues,
        qualityIssues,
      }
    }

    const totalSpecs = s.groups.reduce((sum, group) => sum + (group.specs?.length || 0), 0)
    if (totalSpecs === 0) {
      hasEmptyGroups = true
      hasLowConfidence = true
      validityIssues.push('Groups exist but contain no specifications')
      return {
        format: 'structured',
        status: 'invalid',
        hasNotesOnly,
        hasEmptyGroups,
        hasLowConfidence,
        validityIssues,
        qualityIssues,
      }
    }

    const collisions = detectSpecKeyCollisions(specs)
    for (const c of collisions) {
      qualityIssues.push(`Duplicate spec key "${c.key}" appears ${c.count} times`)
      hasLowConfidence = true
    }

    const emptyCount = s.groups.reduce((count, group) => {
      return (
        count +
        (group.specs?.filter((sp) => !sp.value || String(sp.value).trim() === '').length ?? 0)
      )
    }, 0)
    if (emptyCount > totalSpecs * 0.5) {
      hasLowConfidence = true
      qualityIssues.push(`${emptyCount} specifications have empty values`)
    }

    if (!s.highlights || (Array.isArray(s.highlights) && s.highlights.length === 0)) {
      qualityIssues.push('No highlights defined (recommended: 3-4)')
    }
    if (!s.quickSpecs || (Array.isArray(s.quickSpecs) && s.quickSpecs.length === 0)) {
      qualityIssues.push('No quick specs defined (recommended: 4-6)')
    }

    return {
      format: 'structured',
      status: 'complete',
      hasNotesOnly,
      hasEmptyGroups,
      hasLowConfidence,
      validityIssues,
      qualityIssues,
    }
  }

  if (isFlatSpecifications(specs)) {
    const keyCount = Object.keys(specs as object).length
    if (keyCount < 3) {
      hasLowConfidence = true
      qualityIssues.push(`Only ${keyCount} specifications (too few)`)
    }
    qualityIssues.push('Uses flat format - should be converted to structured')
    return {
      format: 'flat',
      status: 'flat',
      hasNotesOnly,
      hasEmptyGroups,
      hasLowConfidence,
      validityIssues,
      qualityIssues,
    }
  }

  return {
    format: 'invalid',
    status: 'invalid',
    hasNotesOnly,
    hasEmptyGroups,
    hasLowConfidence: true,
    validityIssues: ['Unrecognized specification format'],
    qualityIssues,
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export const dynamic = 'force-dynamic'

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
      return NextResponse.json({ error: 'Forbidden - equipment.read required' }, { status: 403 })
    }

    const format = request.nextUrl.searchParams.get('format')

    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        sku: true,
        model: true,
        specifications: true,
        category: { select: { id: true, name: true, slug: true } },
        media: {
          where: { type: 'image' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const auditItems: EquipmentAuditItem[] = equipment.map((item) => {
      const analyzed = analyzeSpecifications(item.specifications)
      const hasImages = item.media.length > 0
      const qualityIssues = [...analyzed.qualityIssues]
      if (!hasImages) {
        qualityIssues.push('No images uploaded')
      }
      const validityIssues = analyzed.validityIssues
      const issues = [...validityIssues, ...qualityIssues]
      return {
        id: item.id,
        sku: item.sku,
        model: item.model ?? '',
        category: item.category.name,
        status: analyzed.status,
        specsFormat: analyzed.format,
        hasSpecs: analyzed.format !== 'empty',
        hasImages,
        imageCount: item.media.length,
        hasNotesOnly: analyzed.hasNotesOnly,
        hasEmptyGroups: analyzed.hasEmptyGroups,
        hasLowConfidence: analyzed.hasLowConfidence || !hasImages,
        validityIssues,
        qualityIssues,
        issues,
        editUrl: `/admin/inventory/equipment/${item.id}/edit`,
      }
    })

    const completeCount = auditItems.filter((i) => i.status === 'complete').length

    if (format === 'csv') {
      const header = [
        'id',
        'sku',
        'model',
        'category',
        'status',
        'specsFormat',
        'hasImages',
        'imageCount',
        'validityIssues',
        'qualityIssues',
        'editUrl',
      ]
      const lines = [
        header.join(','),
        ...auditItems.map((row) =>
          [
            escapeCsvField(row.id),
            escapeCsvField(row.sku),
            escapeCsvField(row.model),
            escapeCsvField(row.category),
            escapeCsvField(row.status),
            escapeCsvField(row.specsFormat),
            row.hasImages ? '1' : '0',
            String(row.imageCount),
            escapeCsvField(row.validityIssues.join('; ')),
            escapeCsvField(row.qualityIssues.join('; ')),
            escapeCsvField(row.editUrl),
          ].join(',')
        ),
      ]
      const csv = lines.join('\r\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="equipment-spec-audit.csv"',
        },
      })
    }
    const categoryMap = new Map<
      string,
      { id: string; name: string; slug: string; resolvedTemplate: string; known: boolean }
    >()
    for (const item of equipment) {
      const categoryName = item.category.name
      const categorySlug = item.category.slug ?? ''
      const resolvedTemplate = resolveTemplateName(categorySlug || categoryName)
      const known = !!CATEGORY_SPEC_TEMPLATES[resolvedTemplate]
      categoryMap.set(item.category.id, {
        id: item.category.id,
        name: categoryName,
        slug: categorySlug,
        resolvedTemplate,
        known,
      })
    }
    const categoryEntries = Array.from(categoryMap.values())
    const unresolved = categoryEntries
      .filter((entry) => !entry.known)
      .map((entry) => ({
        categoryId: entry.id,
        name: entry.name,
        slug: entry.slug,
        resolvedTemplate: entry.resolvedTemplate,
      }))

    const summary: AuditSummary = {
      total: auditItems.length,
      complete: completeCount,
      needsConversion: auditItems.filter((i) => i.specsFormat === 'flat').length,
      missingSpecs: auditItems.filter((i) => i.specsFormat === 'empty').length,
      invalidSpecs: auditItems.filter(
        (i) =>
          i.status === 'invalid' ||
          i.specsFormat === 'invalid' ||
          i.validityIssues.length > 0
      ).length,
      missingImages: auditItems.filter((i) => !i.hasImages).length,
      percentComplete:
        auditItems.length > 0 ? Math.round((completeCount / auditItems.length) * 100) : 0,
    }

    const response: AuditResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      equipment: auditItems,
      categoryHintAudit: {
        totalCategories: categoryEntries.length,
        mappedToKnownTemplates: categoryEntries.filter((entry) => entry.known).length,
        unresolvedCount: unresolved.length,
        unresolved,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Equipment audit error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to audit equipment specifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
