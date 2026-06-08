/**
 * POST /api/admin/equipment/migrate-specs
 * Convert all equipment with flat specifications to structured format (by category template).
 * Requires equipment.update permission.
 */

import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { CATEGORY_SPEC_TEMPLATES, resolveTemplateName } from '@/lib/ai/spec-templates'
import { convertFlatToStructured } from '@/lib/utils/specifications.utils'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import { normalizeImportedSpecifications } from '@/lib/utils/specifications-import.utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type MigrateSpecsRequest = {
  dryRun?: boolean
  confirmReviewedDryRun?: boolean
  allowUnresolvedCategoryHints?: boolean
  forceSnapshotOverwrite?: boolean
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  const body = ((await request.json().catch(() => ({}))) ?? {}) as MigrateSpecsRequest
  const dryRun = body.dryRun ?? false
  const confirmReviewedDryRun = body.confirmReviewedDryRun ?? false
  const allowUnresolvedCategoryHints = body.allowUnresolvedCategoryHints ?? false
  const forceSnapshotOverwrite = body.forceSnapshotOverwrite ?? false

  if (!dryRun && !confirmReviewedDryRun) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Production run blocked: dry-run must be reviewed by a human first. Re-run with confirmReviewedDryRun=true after review.',
      },
      { status: 400 }
    )
  }

  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      specifications: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      specifications: true,
      customFields: true,
      specBlacklist: true,
      category: { select: { name: true, slug: true } },
    },
  })

  let updated = 0
  let skippedStructured = 0
  let skippedEmpty = 0
  let snapshotCreatedCount = 0
  let notesOnlyDetected = 0
  let flatConverted = 0
  let manualReviewRequired = 0
  const failed: { sku: string; error: string }[] = []

  const categoryRows = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
  })
  const unresolvedCategoryHints = categoryRows
    .map((category) => {
      const resolvedTemplate = resolveTemplateName(category.slug || category.name)
      const known = !!CATEGORY_SPEC_TEMPLATES[resolvedTemplate]
      return {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        resolvedTemplate,
        known,
      }
    })
    .filter((entry) => !entry.known)

  if (!dryRun && unresolvedCategoryHints.length > 0 && !allowUnresolvedCategoryHints) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Production run blocked: unresolved category hint mappings detected. Run category audit and approve or pass allowUnresolvedCategoryHints=true.',
        unresolvedCategoryHints,
      },
      { status: 400 }
    )
  }

  for (const eq of equipment) {
    const rawSpecs = eq.specifications as Record<string, unknown> | null
    if (!rawSpecs || typeof rawSpecs !== 'object' || Object.keys(rawSpecs).length === 0) {
      skippedEmpty++
      continue
    }
    if (isStructuredSpecifications(rawSpecs)) {
      skippedStructured++
      continue
    }

    const blacklist = (eq.specBlacklist as string[] | null) ?? []
    const filteredSpecs = Object.fromEntries(
      Object.entries(rawSpecs).filter(([k]) => !blacklist.includes(k))
    )
    if (Object.keys(filteredSpecs).length === 0) {
      skippedEmpty++
      continue
    }

    const categoryHint = resolveTemplateName(eq.category?.name ?? eq.category?.slug ?? 'Equipment')
      .toLowerCase()
    try {
      let structured = convertFlatToStructured(filteredSpecs as Record<string, unknown>, categoryHint)
      const maybeNotes = (filteredSpecs as Record<string, unknown>).notes
      if (typeof maybeNotes === 'string' && maybeNotes.trim().length > 0) {
        notesOnlyDetected++
        const normalizedFromNotes = normalizeImportedSpecifications({
          specsRaw: null,
          specsRawNotes: maybeNotes,
          categoryHint,
        })
        if (normalizedFromNotes.structured) {
          structured = normalizedFromNotes.structured
        } else {
          manualReviewRequired++
        }
      } else {
        flatConverted++
      }

      const customFields =
        eq.customFields && typeof eq.customFields === 'object'
          ? (eq.customFields as Record<string, unknown>)
          : {}
      const hasSnapshot =
        customFields.specificationsPreMigrationBackup != null &&
        typeof customFields.specificationsPreMigrationBackup === 'object'

      if (!dryRun) {
        await prisma.equipment.update({
          where: { id: eq.id },
          data: {
            specifications: structured as object,
            specSource: 'migration',
            customFields: hasSnapshot && !forceSnapshotOverwrite
              ? (customFields as object)
              : ({
                  ...customFields,
                  specificationsPreMigrationBackup: rawSpecs,
                } as object),
          },
        })
      }
      if (!hasSnapshot || forceSnapshotOverwrite) snapshotCreatedCount++
      updated++
    } catch (e) {
      manualReviewRequired++
      failed.push({
        sku: eq.sku,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      dryRun,
      totalWithSpecs: equipment.length,
      updated,
      skippedStructured,
      skippedEmpty,
      snapshotCreatedCount,
      notesOnlyDetected,
      flatConverted,
      alreadyStructured: skippedStructured,
      manualReviewRequired,
      unresolvedCategoryHintCount: unresolvedCategoryHints.length,
      failed: failed.length,
    },
    unresolvedCategoryHints: unresolvedCategoryHints.length > 0 ? unresolvedCategoryHints : undefined,
    failed: failed.length > 0 ? failed : undefined,
  })
}
