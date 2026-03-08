/**
 * @file route.ts
 * @description AI suggest for equipment form: specs, descriptions, SEO, box contents, related (no DB write).
 * @module app/api/admin/equipment/ai-suggest
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { inferMissingSpecs } from '@/lib/services/ai-spec-parser.service'
import { generateSEOBatch } from '@/lib/services/seo-generation.service'
import {
  generateDescription,
  generateBoxContents,
  generateTags,
} from '@/lib/services/ai-autofill.service'
import { generateMasterFill } from '@/lib/services/ai-content-generation.service'
import { convertFlatToStructured, flattenStructuredSpecs } from '@/lib/utils/specifications.utils'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import { resolveTemplateName } from '@/lib/ai/spec-templates'

export const dynamic = 'force-dynamic'

const bodySchema = {
  name: (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
  categoryId: (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null),
  brandId: (v: unknown) => (typeof v === 'string' ? v : null),
  existingSpecs: (v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined,
  existingShortDescription: (v: unknown) => (typeof v === 'string' ? v : undefined),
  existingLongDescription: (v: unknown) => (typeof v === 'string' ? v : undefined),
}

/**
 * POST /api/admin/equipment/ai-suggest
 * Body: { name, categoryId, brandId?, existingSpecs?, existingShortDescription?, existingLongDescription? }
 * Returns: { specs, shortDescription, longDescription, seo, boxContents?, tags?, relatedEquipmentIds? }
 */
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const name = bodySchema.name(body.name)
    const categoryId = bodySchema.categoryId(body.categoryId)
    if (!name || !categoryId) {
      return NextResponse.json({ error: 'name and categoryId are required' }, { status: 400 })
    }

    const brandId = bodySchema.brandId(body.brandId)
    const rawExistingSpecs = bodySchema.existingSpecs(body.existingSpecs)
    const existingSpecs =
      rawExistingSpecs != null && isStructuredSpecifications(rawExistingSpecs)
        ? flattenStructuredSpecs(rawExistingSpecs)
        : rawExistingSpecs
    const existingShortDescription = bodySchema.existingShortDescription(
      body.existingShortDescription
    )
    const existingLongDescription = bodySchema.existingLongDescription(body.existingLongDescription)

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    })
    const brand = brandId
      ? await prisma.brand.findUnique({
          where: { id: brandId },
          select: { name: true },
        })
      : null

    const productLike = {
      id: 'temp',
      sku: null as string | null,
      category: category ?? { name: 'Equipment' },
      brand: brand ?? { name: 'Unknown' },
      boxContents: undefined as string | undefined,
      translations: [
        {
          locale: 'en',
          name,
          shortDescription: existingShortDescription ?? null,
          longDescription: existingLongDescription ?? null,
          specifications: existingSpecs ?? null,
        },
      ],
    }
    // existingSpecs is already flattened if Structured, so inferMissingSpecs gets flat format

    const provider = ((body.provider ?? process.env.AI_PROVIDER) as 'openai' | 'gemini') || 'gemini'

    // Run master fill (18 multilingual fields in 1 call) + spec inference in parallel
    const [masterResult, specResult, relatedEquipment] = await Promise.all([
      generateMasterFill(provider, {
        name,
        brand: brand?.name ?? 'Unknown',
        category: category?.name ?? 'Equipment',
        specifications: existingSpecs ?? undefined,
        existingDescription: existingLongDescription ?? existingShortDescription ?? undefined,
      }),
      inferMissingSpecs(productLike),
      prisma.equipment.findMany({
        where: { categoryId, deletedAt: null },
        select: { id: true },
        take: 5,
      }),
    ])

    // Normalize existingSpecs to flat key-value only (avoid structural keys like groups/highlights/quickSpecs)
    const existingFlat =
      existingSpecs != null && isStructuredSpecifications(existingSpecs)
        ? flattenStructuredSpecs(existingSpecs)
        : (existingSpecs ?? {})

    // Merge ALL inferred specs — the AI is instructed to always fill every field with creative measurements
    const specsToMerge = (specResult?.specs ?? []).filter((s) => {
      const val = (s as { value: string }).value
      return (
        val &&
        String(val).trim() !== '' &&
        String(val).toLowerCase() !== 'unknown' &&
        String(val).toLowerCase() !== 'n/a'
      )
    })
    const mergedSpecs: Record<string, unknown> = { ...existingFlat }
    for (const s of specsToMerge) {
      const key = (s as { key: string }).key
      const value = (s as { value: string }).value
      if (key && (mergedSpecs[key] == null || String(mergedSpecs[key]).trim() === '')) {
        mergedSpecs[key] = value
      }
    }

    const { logAiAudit } = await import('@/lib/services/ai-audit.service')
    await logAiAudit({
      userId: session.user.id,
      action: 'equipment.ai_suggest',
      resourceType: 'Equipment',
      metadata: { name, categoryId },
    })

    const specConfidences: Record<string, number> = {}
    for (const s of specResult.specs ?? []) {
      const spec = s as { key: string; confidence?: number }
      if (spec.key && spec.confidence != null) {
        specConfidences[spec.key] = spec.confidence
      }
    }

    // Dynamic confidence from feedback history (falls back to defaults if no data)
    let dynamicConfidence: Record<string, number> = {}
    try {
      const { getBulkConfidence } = await import('@/lib/services/ai-confidence.service')
      const bulkConf = await getBulkConfidence(categoryId)
      for (const [field, result] of Object.entries(bulkConf)) {
        dynamicConfidence[field] = result.confidence
      }
    } catch {
      // Fall back to static defaults
    }

    const confidence: Record<string, number> = {
      shortDescription: masterResult?.short_desc_en
        ? (dynamicConfidence.shortDescription ?? 85)
        : 0,
      longDescription: masterResult?.long_desc_en ? (dynamicConfidence.longDescription ?? 82) : 0,
      seoTitle: masterResult?.seo_title_en ? (dynamicConfidence.seoTitle ?? 90) : 0,
      seoDescription: masterResult?.seo_desc_en ? (dynamicConfidence.seoDescription ?? 88) : 0,
      boxContents: (typeof masterResult?.box_contents === 'string' && masterResult.box_contents.trim()) ? (dynamicConfidence.boxContents ?? 78) : 0,
      tags: masterResult?.tags ? (dynamicConfidence.tags ?? 80) : 0,
      ...specConfidences,
    }

    // Convert flat specs into structured format using category template
    const categoryTemplateName = resolveTemplateName(category?.name ?? 'Equipment')
    const structuredSpecs = convertFlatToStructured(
      mergedSpecs as Record<string, unknown>,
      categoryTemplateName
    )

    // Auto-generate highlights from the top 4 most important specs
    const topHighlightKeys: Record<string, string[]> = {
      Cameras: ['sensor_size', 'max_video_resolution', 'codec', 'mount_type'],
      Lenses: ['focal_length', 'max_aperture', 'mount_type', 'image_circle'],
      Lighting: ['power_watts', 'color_temp_range', 'cri', 'output_lux_1m'],
      Audio: ['type', 'polar_pattern', 'frequency_response', 'wireless_range_m'],
      Monitors: ['screen_size', 'resolution', 'brightness_nits', 'color_space'],
      Grip: ['max_load_kg', 'max_height_cm', 'head_type', 'material'],
      Stabilizers: ['max_payload_kg', 'axis_count', 'battery_life_hours', 'follow_modes'],
      Drones: [
        'max_flight_time_min',
        'max_video_resolution',
        'camera_sensor_size',
        'max_transmission_range',
      ],
      Power: ['capacity_wh', 'voltage', 'mount_type', 'max_output_watts'],
      Recorders: ['max_resolution', 'codec', 'media_type', 'screen_size'],
      Wireless: ['max_range_m', 'latency_ms', 'max_resolution', 'frequency_band'],
    }
    const highlightKeys =
      topHighlightKeys[categoryTemplateName] ?? Object.keys(mergedSpecs).slice(0, 4)
    const autoHighlights = highlightKeys
      .filter((k) => mergedSpecs[k] != null && String(mergedSpecs[k]).trim() !== '')
      .map((k) => ({
        icon: 'star',
        label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: String(mergedSpecs[k]),
      }))
    if (autoHighlights.length > 0) {
      structuredSpecs.highlights = autoHighlights.slice(0, 4)
    }

    // Auto-generate quick spec pills from first 6 specs
    const quickSpecKeys = Object.keys(mergedSpecs)
      .filter((k) => mergedSpecs[k] != null && String(mergedSpecs[k]).trim() !== '')
      .slice(0, 6)
    structuredSpecs.quickSpecs = quickSpecKeys.map((k) => ({
      icon: 'star',
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(mergedSpecs[k]),
    }))

    return NextResponse.json({
      specs: mergedSpecs,
      structuredSpecs,
      shortDescription: masterResult?.short_desc_en || existingShortDescription || '',
      longDescription: masterResult?.long_desc_en || existingLongDescription || '',
      seo: masterResult?.seo_title_en
        ? {
            metaTitle: masterResult.seo_title_en,
            metaDescription: masterResult.seo_desc_en,
            metaKeywords: masterResult.seo_keywords_en,
          }
        : { metaTitle: name, metaDescription: existingShortDescription ?? name, metaKeywords: '' },
      boxContents: (() => {
        const bc: unknown = masterResult?.box_contents
        if (typeof bc === 'string') return bc.trim() || undefined
        if (Array.isArray(bc)) return (bc as string[]).join(', ')
        return undefined
      })(),
      tags: (() => {
        const t: unknown = masterResult?.tags
        if (typeof t === 'string') return t.trim() || undefined
        if (Array.isArray(t)) return (t as string[]).join(', ')
        return undefined
      })(),
      relatedEquipmentIds: relatedEquipment.map((e) => e.id),
      confidence,
      // Full multilingual translations for auto-fill across all 3 locales
      translations: masterResult
        ? {
            en: {
              name,
              shortDescription: masterResult.short_desc_en || '',
              longDescription: masterResult.long_desc_en || '',
              seoTitle: masterResult.seo_title_en || '',
              seoDescription: masterResult.seo_desc_en || '',
              seoKeywords: masterResult.seo_keywords_en || '',
            },
            ar: {
              name: masterResult.name_ar || '',
              shortDescription: masterResult.short_desc_ar || '',
              longDescription: masterResult.long_desc_ar || '',
              seoTitle: masterResult.seo_title_ar || '',
              seoDescription: masterResult.seo_desc_ar || '',
              seoKeywords: masterResult.seo_keywords_ar || '',
            },
            zh: {
              name: masterResult.name_zh || '',
              shortDescription: masterResult.short_desc_zh || '',
              longDescription: masterResult.long_desc_zh || '',
              seoTitle: masterResult.seo_title_zh || '',
              seoDescription: masterResult.seo_desc_zh || '',
              seoKeywords: masterResult.seo_keywords_zh || '',
            },
          }
        : undefined,
    })
  } catch (error: unknown) {
    console.error('Equipment AI suggest failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI suggest failed' },
      { status: 500 }
    )
  }
}
