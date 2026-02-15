// ============================================================================
// API: Bulk Convert Equipment Specifications
// Purpose: Convert flat specifications to structured format
// Route: POST /api/admin/equipment/convert-specifications
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isStructuredSpecifications,
  isFlatSpecifications,
  type FlatSpecifications,
  type StructuredSpecifications
} from '@/types/specifications';
import {
  convertFlatToStructured,
  validateSpecifications
} from '@/lib/specifications-utils';

// ============================================================================
// Types
// ============================================================================

export interface ConversionRequest {
  equipmentIds: string[];
  dryRun?: boolean;
  options?: {
    preserveOriginal?: boolean;
    autoFillDefaults?: boolean;
    skipValidation?: boolean;
  };
}

export interface ConversionResult {
  id: string;
  sku: string;
  model: string;
  category: string;
  result: 'success' | 'skipped' | 'failed';
  reason?: string;
  error?: string;
  specsPreview?: {
    groups: number;
    totalSpecs: number;
    highlights: number;
    quickSpecs: number;
  };
}

export interface ConversionResponse {
  success: boolean;
  dryRun: boolean;
  timestamp: string;
  summary: {
    total: number;
    converted: number;
    skipped: number;
    failed: number;
  };
  results: ConversionResult[];
  errors: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

async function convertEquipmentSpecifications(
  equipmentId: string,
  dryRun: boolean,
  options: ConversionRequest['options'] = {}
): Promise<ConversionResult> {
  // Fetch equipment with full details
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      category: true
    }
  });

  if (!equipment) {
    return {
      id: equipmentId,
      sku: '',
      model: '',
      category: '',
      result: 'failed',
      error: 'Equipment not found'
    };
  }

  const result: ConversionResult = {
    id: equipment.id,
    sku: equipment.sku,
    model: equipment.model,
    category: equipment.category.name,
    result: 'success'
  };

  // Check if already structured
  if (isStructuredSpecifications(equipment.specifications)) {
    result.result = 'skipped';
    result.reason = 'Already in structured format';
    return result;
  }

  // Check if empty
  if (!equipment.specifications || Object.keys(equipment.specifications).length === 0) {
    result.result = 'skipped';
    result.reason = 'No specifications to convert';
    return result;
  }

  // Must be flat format
  if (!isFlatSpecifications(equipment.specifications)) {
    result.result = 'failed';
    result.error = 'Invalid specification format (not flat or structured)';
    return result;
  }

  try {
    // Convert to structured
    const structuredSpecs = convertFlatToStructured(
      equipment.specifications as FlatSpecifications,
      {
        categoryHint: equipment.category.name.toLowerCase(),
        preserveOriginal: options.preserveOriginal ?? true,
        autoFillDefaults: options.autoFillDefaults ?? true
      }
    );

    // Validate (unless skipped)
    if (!options.skipValidation) {
      const validation = validateSpecifications(structuredSpecs);
      if (!validation.valid) {
        result.result = 'failed';
        result.error = `Validation failed: ${validation.errors.join(', ')}`;
        return result;
      }
    }

    // Generate preview
    result.specsPreview = {
      groups: structuredSpecs.groups.length,
      totalSpecs: structuredSpecs.groups.reduce(
        (sum, g) => sum + g.specs.length,
        0
      ),
      highlights: structuredSpecs.highlights?.length || 0,
      quickSpecs: structuredSpecs.quickSpecs?.length || 0
    };

    // Save to database (if not dry run)
    if (!dryRun) {
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          specifications: structuredSpecs as any
        }
      });
    }

    result.result = 'success';
    return result;

  } catch (error) {
    result.result = 'failed';
    result.error = error instanceof Error ? error.message : 'Unknown conversion error';
    return result;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ConversionRequest = await request.json();

    // Validate request
    if (!body.equipmentIds || !Array.isArray(body.equipmentIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: equipmentIds must be an array'
        },
        { status: 400 }
      );
    }

    if (body.equipmentIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No equipment IDs provided'
        },
        { status: 400 }
      );
    }

    // Limit batch size (prevent timeout)
    if (body.equipmentIds.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Batch size too large (max: 100). Please convert in smaller batches.'
        },
        { status: 400 }
      );
    }

    const dryRun = body.dryRun ?? false;
    const options = body.options || {};
    const errors: string[] = [];

    // Process each equipment item
    const results: ConversionResult[] = [];

    for (const equipmentId of body.equipmentIds) {
      try {
        const result = await convertEquipmentSpecifications(
          equipmentId,
          dryRun,
          options
        );
        results.push(result);

        if (result.result === 'failed') {
          errors.push(`${result.sku}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${equipmentId}: ${errorMsg}`);
        
        results.push({
          id: equipmentId,
          sku: 'unknown',
          model: 'unknown',
          category: 'unknown',
          result: 'failed',
          error: errorMsg
        });
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      converted: results.filter(r => r.result === 'success').length,
      skipped: results.filter(r => r.result === 'skipped').length,
      failed: results.filter(r => r.result === 'failed').length
    };

    // Build response
    const response: ConversionResponse = {
      success: summary.failed === 0,
      dryRun,
      timestamp: new Date().toISOString(),
      summary,
      results,
      errors
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Bulk conversion error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk conversion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST-only route
// ============================================================================

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to convert specifications.'
    },
    { status: 405 }
  );
}
