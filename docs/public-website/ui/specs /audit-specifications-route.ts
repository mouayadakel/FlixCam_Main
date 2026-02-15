// ============================================================================
// API: Equipment Specifications Audit
// Purpose: Comprehensive audit of all equipment specifications
// Route: GET /api/admin/equipment/audit-specifications
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isStructuredSpecifications,
  isFlatSpecifications,
  type AnySpecifications
} from '@/types/specifications';

// ============================================================================
// Types
// ============================================================================

export interface EquipmentAuditItem {
  id: string;
  sku: string;
  model: string;
  category: string;
  status: 'complete' | 'flat' | 'missing' | 'invalid';
  specsFormat: 'structured' | 'flat' | 'empty' | 'invalid';
  hasSpecs: boolean;
  hasImages: boolean;
  imageCount: number;
  issues: string[];
  editUrl: string;
}

export interface AuditSummary {
  total: number;
  complete: number;
  needsConversion: number;
  missingSpecs: number;
  invalidSpecs: number;
  missingImages: number;
  percentComplete: number;
}

export interface AuditResponse {
  success: boolean;
  timestamp: string;
  summary: AuditSummary;
  equipment: EquipmentAuditItem[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function analyzeSpecifications(specs: any): {
  format: EquipmentAuditItem['specsFormat'];
  status: EquipmentAuditItem['status'];
  issues: string[];
} {
  const issues: string[] = [];

  // No specifications
  if (!specs) {
    return {
      format: 'empty',
      status: 'missing',
      issues: ['No specifications provided']
    };
  }

  // Empty object
  if (typeof specs === 'object' && Object.keys(specs).length === 0) {
    return {
      format: 'empty',
      status: 'missing',
      issues: ['Specifications object is empty']
    };
  }

  // Structured format
  if (isStructuredSpecifications(specs)) {
    // Check if groups exist and have content
    if (!specs.groups || specs.groups.length === 0) {
      issues.push('Structured format but no specification groups');
      return {
        format: 'structured',
        status: 'invalid',
        issues
      };
    }

    // Check if groups have specs
    const totalSpecs = specs.groups.reduce(
      (sum, group) => sum + (group.specs?.length || 0),
      0
    );

    if (totalSpecs === 0) {
      issues.push('Groups exist but contain no specifications');
      return {
        format: 'structured',
        status: 'invalid',
        issues
      };
    }

    // Check for empty values
    const emptyCount = specs.groups.reduce((count, group) => {
      return count + group.specs.filter(s => !s.value || s.value.trim() === '').length;
    }, 0);

    if (emptyCount > totalSpecs * 0.5) {
      issues.push(`${emptyCount} specifications have empty values`);
    }

    // Check for highlights and quickSpecs
    if (!specs.highlights || specs.highlights.length === 0) {
      issues.push('No highlights defined (recommended: 3-4)');
    }

    if (!specs.quickSpecs || specs.quickSpecs.length === 0) {
      issues.push('No quick specs defined (recommended: 4-6)');
    }

    return {
      format: 'structured',
      status: issues.length > 0 ? 'invalid' : 'complete',
      issues
    };
  }

  // Flat format
  if (isFlatSpecifications(specs)) {
    const keyCount = Object.keys(specs).length;

    if (keyCount < 3) {
      issues.push(`Only ${keyCount} specifications (too few)`);
    }

    issues.push('Uses flat format - should be converted to structured');

    return {
      format: 'flat',
      status: 'flat',
      issues
    };
  }

  // Invalid format
  return {
    format: 'invalid',
    status: 'invalid',
    issues: ['Unrecognized specification format']
  };
}

// ============================================================================
// Main Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Fetch all equipment with necessary data
    const equipment = await prisma.equipment.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        sku: true,
        model: true,
        specifications: true,
        category: {
          select: {
            name: true
          }
        },
        media: {
          where: {
            type: 'image'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Analyze each equipment item
    const auditItems: EquipmentAuditItem[] = equipment.map(item => {
      const { format, status, issues } = analyzeSpecifications(
        item.specifications
      );

      const hasImages = item.media.length > 0;
      if (!hasImages) {
        issues.push('No images uploaded');
      }

      return {
        id: item.id,
        sku: item.sku,
        model: item.model,
        category: item.category.name,
        status,
        specsFormat: format,
        hasSpecs: format !== 'empty',
        hasImages,
        imageCount: item.media.length,
        issues,
        editUrl: `/admin/inventory/equipment/${item.id}/edit`
      };
    });

    // Calculate summary
    const summary: AuditSummary = {
      total: auditItems.length,
      complete: auditItems.filter(i => i.status === 'complete').length,
      needsConversion: auditItems.filter(i => i.specsFormat === 'flat').length,
      missingSpecs: auditItems.filter(i => i.specsFormat === 'empty').length,
      invalidSpecs: auditItems.filter(i => i.status === 'invalid' && i.specsFormat !== 'empty').length,
      missingImages: auditItems.filter(i => !i.hasImages).length,
      percentComplete: 0
    };

    summary.percentComplete = summary.total > 0
      ? Math.round((summary.complete / summary.total) * 100)
      : 0;

    // Build response
    const response: AuditResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      equipment: auditItems
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Equipment audit error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to audit equipment specifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Export for testing
// ============================================================================

export { analyzeSpecifications };
