/**
 * POST /api/admin/equipment/convert-specifications
 * Convert flat specifications to structured format for given equipment IDs.
 * Supports dryRun. Requires equipment.update permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { isStructuredSpecifications, isFlatSpecifications } from '@/lib/types/specifications.types'
import { convertFlatToStructured, validateSpecifications } from '@/lib/utils/specifications.utils'

// ============================================================================
// Types
// ============================================================================

export interface ConversionRequest {
  equipmentIds: string[]
  dryRun?: boolean
  options?: {
    preserveOriginal?: boolean
    autoFillDefaults?: boolean
    skipValidation?: boolean
  }
}

export interface ConversionResult {
  id: string
  sku: string
  model: string
  category: string
  result: 'success' | 'skipped' | 'failed'
  reason?: string
  error?: string
  specsPreview?: {
    groups: number
    totalSpecs: number
    highlights: number
    quickSpecs: number
  }
}

export interface ConversionResponse {
  success: boolean
  dryRun: boolean
  timestamp: string
  summary: {
    total: number
    converted: number
    skipped: number
    failed: number
  }
  results: ConversionResult[]
  errors: string[]
}

const BATCH_LIMIT = 100

// ============================================================================
// Helper: convert one equipment
// ============================================================================

async function convertEquipmentSpecifications(
  equipmentId: string,
  dryRun: boolean,
  _options: ConversionRequest['options'] = {}
): Promise<ConversionResult> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { category: true },
  })

  if (!equipment) {
    return {
      id: equipmentId,
      sku: '',
      model: '',
      category: '',
      result: 'failed',
      error: 'Equipment not found',
    }
  }

  const result: ConversionResult = {
    id: equipment.id,
    sku: equipment.sku,
    model: equipment.model ?? '',
    category: equipment.category.name,
    result: 'success',
  }

  if (isStructuredSpecifications(equipment.specifications)) {
    result.result = 'skipped'
    result.reason = 'Already in structured format'
    return result
  }

  if (
    !equipment.specifications ||
    typeof equipment.specifications !== 'object' ||
    Object.keys(equipment.specifications).length === 0
  ) {
    result.result = 'skipped'
    result.reason = 'No specifications to convert'
    return result
  }

  if (!isFlatSpecifications(equipment.specifications)) {
    result.result = 'failed'
    result.error = 'Invalid specification format (not flat or structured)'
    return result
  }

  try {
    const categoryHint = equipment.category.slug ?? equipment.category.name ?? ''
    const flatSpecs = equipment.specifications as Record<string, unknown>
    const structuredSpecs = convertFlatToStructured(flatSpecs, categoryHint)

    const validation = validateSpecifications(structuredSpecs)
    if (!validation.valid) {
      result.result = 'failed'
      result.error = `Validation failed: ${validation.errors.join(', ')}`
      return result
    }

    result.specsPreview = {
      groups: structuredSpecs.groups.length,
      totalSpecs: structuredSpecs.groups.reduce((sum, g) => sum + g.specs.length, 0),
      highlights: structuredSpecs.highlights?.length ?? 0,
      quickSpecs: structuredSpecs.quickSpecs?.length ?? 0,
    }

    if (!dryRun) {
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: { specifications: structuredSpecs as object },
      })
    }

    result.result = 'success'
    return result
  } catch (error) {
    result.result = 'failed'
    result.error = error instanceof Error ? error.message : 'Unknown conversion error'
    return result
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
      return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
    }

    const body = (await request.json()) as ConversionRequest

    if (!body.equipmentIds || !Array.isArray(body.equipmentIds)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: equipmentIds must be an array' },
        { status: 400 }
      )
    }

    if (body.equipmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No equipment IDs provided' },
        { status: 400 }
      )
    }

    if (body.equipmentIds.length > BATCH_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size too large (max: ${BATCH_LIMIT}). Please convert in smaller batches.`,
        },
        { status: 400 }
      )
    }

    const dryRun = body.dryRun ?? false
    const errors: string[] = []
    const results: ConversionResult[] = []

    for (const equipmentId of body.equipmentIds) {
      try {
        const itemResult = await convertEquipmentSpecifications(equipmentId, dryRun, body.options)
        results.push(itemResult)
        if (itemResult.result === 'failed') {
          errors.push(`${itemResult.sku}: ${itemResult.error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${equipmentId}: ${errorMsg}`)
        results.push({
          id: equipmentId,
          sku: 'unknown',
          model: 'unknown',
          category: 'unknown',
          result: 'failed',
          error: errorMsg,
        })
      }
    }

    const summary = {
      total: results.length,
      converted: results.filter((r) => r.result === 'success').length,
      skipped: results.filter((r) => r.result === 'skipped').length,
      failed: results.filter((r) => r.result === 'failed').length,
    }

    const response: ConversionResponse = {
      success: summary.failed === 0,
      dryRun,
      timestamp: new Date().toISOString(),
      summary,
      results,
      errors,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Bulk conversion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk conversion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to convert specifications.' },
    { status: 405 }
  )
}
