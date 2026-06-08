/**
 * @file equipment.validator.ts
 * @description Zod validation schemas for equipment
 * @module validators/equipment
 */

import * as z from 'zod'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

const iconNameSchema = z.enum([
  'camera',
  'video',
  'scale',
  'battery',
  'aperture',
  'monitor',
  'layers',
  'move',
  'star',
  'zap',
  'hard-drive',
  'wifi',
  'ruler',
  'cable',
  'thermometer',
  'sun',
  'gauge',
  'info',
])

const specItemTypeSchema = z.enum(['text', 'boolean', 'range', 'colorTemp'])

const specItemSchema = z
  .object({
    key: z.string().max(120).optional().transform((v) => v?.trim() ?? ''),
    label: z.string().max(200).optional().transform((v) => v?.trim() ?? ''),
    labelAr: z.string().max(200).optional(),
    // Allow empty string so templates and drafts can be saved; publish gating is handled elsewhere.
    value: z.string().max(2000),
    type: specItemTypeSchema.optional(),
    highlight: z.boolean().optional(),
    rangePercent: z.number().int().min(0).max(100).optional(),
    unit: z.string().max(50).optional(),
  })
  .superRefine((item, ctx) => {
    const hasBody = Boolean(
      item.key?.trim() || item.label?.trim() || (typeof item.value === 'string' && item.value.trim())
    )
    if (item.type === 'range' && item.rangePercent == null && hasBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rangePercent is required when type=range',
        path: ['rangePercent'],
      })
    }
  })

const specGroupSchema = z.object({
  label: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : 'General')),
  labelAr: z.string().max(200).optional(),
  icon: iconNameSchema,
  priority: z.number().int().min(1),
  specs: z.array(specItemSchema),
})

/** Raw highlight row from the editor — empty/incomplete rows are stripped so drafts can save */
const specHighlightInputSchema = z.object({
  icon: z.union([iconNameSchema, z.string().max(50)]).optional(),
  label: z.string().max(200).optional(),
  value: z.string().max(500).optional(),
  sublabel: z.string().max(200).optional(),
})

/** Raw quick-spec row — empty rows stripped before persist */
const quickSpecInputSchema = z.object({
  icon: z.union([iconNameSchema, z.string().max(50)]).optional(),
  label: z.string().max(200).optional(),
  value: z.string().max(500).optional(),
})

type IconNameEnum = z.infer<typeof iconNameSchema>

function coerceHighlightIcon(raw: unknown): IconNameEnum {
  const r = iconNameSchema.safeParse(raw)
  return r.success ? r.data : 'info'
}

function normalizeHighlightRows(
  rows: z.infer<typeof specHighlightInputSchema>[] | undefined
): Array<{ icon: IconNameEnum; label: string; value: string; sublabel?: string }> | undefined {
  if (!rows?.length) return undefined
  const mapped = rows
    .map((h) => {
      const label = String(h.label ?? '').trim()
      const value = String(h.value ?? '').trim()
      const sublabel = String(h.sublabel ?? '').trim()
      return {
        icon: coerceHighlightIcon(h.icon),
        label,
        value,
        ...(sublabel !== '' ? { sublabel } : {}),
      }
    })
    .filter((h) => h.label !== '' || h.value !== '')
  return mapped.length > 0 ? mapped : undefined
}

function normalizeQuickSpecRows(
  rows: z.infer<typeof quickSpecInputSchema>[] | undefined
): Array<{ icon: IconNameEnum; label: string; value: string }> | undefined {
  if (!rows?.length) return undefined
  const mapped = rows
    .map((q) => ({
      icon: coerceHighlightIcon(q.icon),
      label: String(q.label ?? '').trim(),
      value: String(q.value ?? '').trim(),
    }))
    .filter((q) => q.label !== '' || q.value !== '')
  return mapped.length > 0 ? mapped : undefined
}

const structuredSpecificationsSchema = z
  .object({
    groups: z.array(specGroupSchema),
    highlights: z
      .array(specHighlightInputSchema)
      .optional()
      .transform(normalizeHighlightRows),
    quickSpecs: z
      .array(quickSpecInputSchema)
      .optional()
      .transform(normalizeQuickSpecRows),
    customHtml: z.string().max(20000).optional(),
  })
  .superRefine((specs, ctx) => {
    const priorities = new Set<number>()
    for (let i = 0; i < specs.groups.length; i++) {
      const p = specs.groups[i]?.priority
      if (priorities.has(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate group priority "${p}"`,
          path: ['groups', i, 'priority'],
        })
      }
      priorities.add(p)
    }

    const keys = new Set<string>()
    for (let gi = 0; gi < specs.groups.length; gi++) {
      const group = specs.groups[gi]
      for (let si = 0; si < group.specs.length; si++) {
        const rawKey = group.specs[si]?.key?.trim()
        if (!rawKey) continue
        const key = rawKey.toLowerCase()
        if (keys.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate spec key "${rawKey}" (keys must be unique across all groups, case-insensitive)`,
            path: ['groups', gi, 'specs', si, 'key'],
          })
        }
        keys.add(key)
      }
    }
  })

// Custom validator for URLs that also accepts local paths used by legacy media rows.
const urlOrRelativePath = z.string().refine((val) => {
  if (!val || val.trim() === '') return true
  const normalized = val.trim()
  if (normalized.startsWith('/')) return true
  if (normalized.startsWith('uploads/')) return true
  if (normalized.startsWith('./uploads/')) return true
  if (normalized.startsWith('data:')) return true // Allow base64 temporarily if needed
  try {
    new URL(normalized)
    return true
  } catch {
    return false
  }
}, { message: 'يجب أن يكون الرابط صالحاً أو مساراً محلياً' })

export const equipmentConditionSchema = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'MAINTENANCE'])

// Translation schema for multi-language support
export const equipmentTranslationSchema = z.object({
  locale: z.enum(['ar', 'en', 'zh', 'fr'], { required_error: 'Locale is required' }),
  name: z
    .string()
    .max(200, { message: 'Name is too long' })
    .optional()
    .transform((v) => v ?? ''),
  description: z.string().max(5000, { message: 'Description is too long' }).optional(),
  shortDescription: z.string().max(500, { message: 'Short description is too long' }).optional(),
  longDescription: z.string().max(5000, { message: 'Long description is too long' }).optional(),
  seoTitle: z.string().max(200, { message: 'SEO title is too long' }).optional(),
  seoDescription: z.string().max(500, { message: 'SEO description is too long' }).optional(),
  seoKeywords: z.string().max(500, { message: 'SEO keywords is too long' }).optional(),
})

// Base schema without refine (so we can use .partial() on it)
const baseEquipmentSchema = z.object({
  sku: z.string().max(100, { message: 'SKU is too long' }).optional().or(z.literal('')),
  model: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().max(200, { message: 'Model name is too long' }).optional()
  ),
  categoryId: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
        ? undefined
        : v,
    z.string().min(1, { message: 'Category is required' }).optional()
  ),
  subCategoryId: z.string().optional(),
  brandId: z.string().optional(),
  condition: equipmentConditionSchema.optional(),
  /** Cleared number inputs often submit NaN — treat like missing so partial saves work */
  quantityTotal: z.preprocess(
    (v) =>
      v === '' ||
      v === undefined ||
      v === null ||
      (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().int().min(1, { message: 'Quantity must be at least 1' }).optional()
  ),
  quantityAvailable: z.preprocess(
    (v) =>
      v === '' ||
      v === undefined ||
      v === null ||
      (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z
      .number()
      .int()
      .min(0, { message: 'Available quantity cannot be negative' })
      .optional()
  ),
  dailyPrice: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().min(0, { message: 'Daily price must be positive' }).optional()
  ),
  weeklyPrice: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().min(0, { message: 'Weekly price must be positive' }).optional()
  ),
  monthlyPrice: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().min(0, { message: 'Monthly price must be positive' }).optional()
  ),
  /** سعر الشراء — internal only, for tracking and سند الأمر (not shown to customers) */
  purchasePrice: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().min(0, { message: 'Purchase price cannot be negative' }).optional()
  ),
  /** مبلغ التأمين — اختياري. Empty/NaN/null from number input coerced to undefined. */
  depositAmount: z.preprocess(
    (v) =>
      v === '' ||
      v === undefined ||
      v === null ||
      (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().min(0, { message: 'Deposit must be positive' }).optional()
  ),
  /** التأمين إلزامي للعميل — default false (لا يتطلب تأمين) */
  requiresDeposit: z.boolean().optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  requiresAssistant: z.boolean().optional(),
  warehouseLocation: z.string().max(200, { message: 'Warehouse location is too long' }).optional(),
  barcode: z.string().max(100, { message: 'Barcode is too long' }).optional(),
  /** Accepts both StructuredSpecifications (from SpecificationsEditor) and flat Record format.
   *  If the payload has `groups`, it must satisfy structured schema — union alone would fall through
   *  to `z.record` when structured fails; this refine closes that gap. */
  specifications: z
    .union([
      structuredSpecificationsSchema,
      z.record(z.string(), z.unknown()),
    ])
    .superRefine((val, ctx) => {
      if (
        val != null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        'groups' in val &&
        Array.isArray((val as { groups?: unknown }).groups)
      ) {
        const r = structuredSpecificationsSchema.safeParse(val)
        if (!r.success) {
          for (const issue of r.error.issues) {
            ctx.addIssue(issue as any)
          }
        }
      }
    })
    .optional(),
  customFields: z.record(z.unknown()).optional(),
  // Media fields
  featuredImageUrl: urlOrRelativePath.optional().or(z.literal('')),
  galleryImageUrls: z.array(urlOrRelativePath).optional(),
  videoUrl: urlOrRelativePath.optional().or(z.literal('')),
  // Translations
  translations: z.array(equipmentTranslationSchema).optional(),
  // Related/Recommended equipment
  relatedEquipmentIds: z
    .array(z.string().min(1, { message: 'Equipment ID cannot be empty' }))
    .optional(),
  // Box contents and buffer time
  tags: z.string().max(1000, { message: 'Tags is too long' }).optional(),
  boxContents: z.string().max(2000, { message: 'Box contents is too long' }).optional(),
  bufferTime: z.preprocess(
    (v) =>
      v === '' ||
      v === undefined ||
      v === null ||
      (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number().int().min(0, { message: 'Buffer time cannot be negative' }).optional()
  ),
  bufferTimeUnit: z.enum(['hours', 'days']).optional(),
  /** Set when specs come from AI suggest — persisted on save */
  specConfidence: z.number().min(0).max(1).optional(),
  specLastInferredAt: z.coerce.date().optional(),
  specSource: z.enum(['import', 'ai-infer', 'url-extract', 'manual', 'migration']).optional(),
  itemType: z.enum(['crew', 'equipment']).optional(),
  bookingMode: z.enum(['cart', 'quote']).optional(),
  crewProfile: z
    .object({
      nameEn: z.string().max(200).optional(),
      nameAr: z.string().max(200).optional(),
      bioEn: z.string().max(2000).optional(),
      bioAr: z.string().max(2000).optional(),
      experienceYears: z.number().int().min(0).max(60).optional(),
      specialties: z.array(z.string().max(80)).max(12).optional(),
      photoUrl: z.string().max(500).optional(),
    })
    .optional(),
})

// Create schema — allow incomplete drafts; publish gating (images, active/featured) is enforced in EquipmentService.
export const createEquipmentSchema = baseEquipmentSchema

// Update schema - make all fields optional. Image requirements are enforced
// at the service layer where we can check existing DB media records.
export const updateEquipmentSchema = baseEquipmentSchema
  .partial()
  .extend({
    id: z.string().min(1, { message: 'Equipment ID is required' }),
  })

export type CreateEquipmentFormData = z.infer<typeof createEquipmentSchema>
export type UpdateEquipmentFormData = z.infer<typeof updateEquipmentSchema>
export type EquipmentTranslationFormData = z.infer<typeof equipmentTranslationSchema>

export function getSpecsAdvisoryWarnings(specifications: unknown): string[] {
  if (!specifications || typeof specifications !== 'object') {
    return ['Specifications are missing']
  }
  if (!isStructuredSpecifications(specifications)) {
    return ['Specifications should be saved as structured groups before publish']
  }
  const groups = specifications.groups ?? []
  const specCount = groups.reduce((sum, group) => sum + (group.specs?.length ?? 0), 0)
  const warnings: string[] = []
  if (groups.length === 0) warnings.push('Specifications have no groups')
  if (specCount === 0) warnings.push('Specification groups contain no items')
  return warnings
}
