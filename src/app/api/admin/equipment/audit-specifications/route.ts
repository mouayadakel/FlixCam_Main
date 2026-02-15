/**
 * GET /api/admin/equipment/audit-specifications
 * Audit all equipment: specifications format (structured/flat/empty/invalid) and image presence.
 * Requires equipment.read permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import {
  isStructuredSpecifications,
  isFlatSpecifications,
} from '@/lib/types/specifications.types'

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
}

// ============================================================================
// Helper: analyze specifications
// ============================================================================

function analyzeSpecifications(specs: unknown): {
  format: EquipmentAuditItem['specsFormat']
  status: EquipmentAuditItem['status']
  issues: string[]
} {
  const issues: string[] = []

  if (!specs) {
    return {
      format: 'empty',
      status: 'missing',
      issues: ['No specifications provided'],
    }
  }

  if (typeof specs === 'object' && Object.keys(specs as object).length === 0) {
    return {
      format: 'empty',
      status: 'missing',
      issues: ['Specifications object is empty'],
    }
  }

  if (isStructuredSpecifications(specs)) {
    const s = specs as { groups?: Array<{ specs?: Array<{ value?: string }> }>; highlights?: unknown[]; quickSpecs?: unknown[] }
    if (!s.groups || s.groups.length === 0) {
      issues.push('Structured format but no specification groups')
      return {
        format: 'structured',
        status: 'invalid',
        issues,
      }
    }

    const totalSpecs = s.groups.reduce(
      (sum, group) => sum + (group.specs?.length || 0),
      0
    )
    if (totalSpecs === 0) {
      issues.push('Groups exist but contain no specifications')
      return {
        format: 'structured',
        status: 'invalid',
        issues,
      }
    }

    const emptyCount = s.groups.reduce((count, group) => {
      return (
        count +
        (group.specs?.filter((sp) => !sp.value || String(sp.value).trim() === '').length ?? 0)
      )
    }, 0)
    if (emptyCount > totalSpecs * 0.5) {
      issues.push(`${emptyCount} specifications have empty values`)
    }

    if (!s.highlights || (Array.isArray(s.highlights) && s.highlights.length === 0)) {
      issues.push('No highlights defined (recommended: 3-4)')
    }
    if (!s.quickSpecs || (Array.isArray(s.quickSpecs) && s.quickSpecs.length === 0)) {
      issues.push('No quick specs defined (recommended: 4-6)')
    }

    return {
      format: 'structured',
      status: issues.length > 0 ? 'invalid' : 'complete',
      issues,
    }
  }

  if (isFlatSpecifications(specs)) {
    const keyCount = Object.keys(specs as object).length
    if (keyCount < 3) {
      issues.push(`Only ${keyCount} specifications (too few)`)
    }
    issues.push('Uses flat format - should be converted to structured')
    return {
      format: 'flat',
      status: 'flat',
      issues,
    }
  }

  return {
    format: 'invalid',
    status: 'invalid',
    issues: ['Unrecognized specification format'],
  }
}

// ============================================================================
// GET Handler
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
      return NextResponse.json(
        { error: 'Forbidden - equipment.read required' },
        { status: 403 }
      )
    }

    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        sku: true,
        model: true,
        specifications: true,
        category: { select: { name: true } },
        media: {
          where: { type: 'image' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const auditItems: EquipmentAuditItem[] = equipment.map((item) => {
      const { format, status, issues } = analyzeSpecifications(item.specifications)
      const hasImages = item.media.length > 0
      if (!hasImages) {
        issues.push('No images uploaded')
      }
      return {
        id: item.id,
        sku: item.sku,
        model: item.model ?? '',
        category: item.category.name,
        status,
        specsFormat: format,
        hasSpecs: format !== 'empty',
        hasImages,
        imageCount: item.media.length,
        issues,
        editUrl: `/admin/inventory/equipment/${item.id}/edit`,
      }
    })

    const completeCount = auditItems.filter((i) => i.status === 'complete').length
    const summary: AuditSummary = {
      total: auditItems.length,
      complete: completeCount,
      needsConversion: auditItems.filter((i) => i.specsFormat === 'flat').length,
      missingSpecs: auditItems.filter((i) => i.specsFormat === 'empty').length,
      invalidSpecs: auditItems.filter(
        (i) => i.status === 'invalid' && i.specsFormat !== 'empty'
      ).length,
      missingImages: auditItems.filter((i) => !i.hasImages).length,
      percentComplete:
        auditItems.length > 0
          ? Math.round((completeCount / auditItems.length) * 100)
          : 0,
    }

    const response: AuditResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      equipment: auditItems,
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
