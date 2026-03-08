/**
 * @file equipment.validator.ts
 * @description Zod validation schemas for equipment
 * @module validators/equipment
 */

import * as z from 'zod'

export const equipmentConditionSchema = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'MAINTENANCE'])

// Translation schema for multi-language support
export const equipmentTranslationSchema = z.object({
  locale: z.enum(['ar', 'en', 'zh'], { required_error: 'Locale is required' }),
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
  model: z.string().min(1, { message: 'Model is required' }).max(200, { message: 'Model name is too long' }),
  categoryId: z.string().min(1, { message: 'Category is required' }),
  subCategoryId: z.string().optional(),
  brandId: z.string().optional(),
  condition: equipmentConditionSchema.optional(),
  quantityTotal: z.number().int().min(1, { message: 'Quantity must be at least 1' }).optional(),
  quantityAvailable: z
    .number()
    .int()
    .min(0, { message: 'Available quantity cannot be negative' })
    .optional(),
  dailyPrice: z.preprocess(
    (v) =>
      v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))
        ? undefined
        : v,
    z.number({ required_error: 'السعر اليومي مطلوب' }).min(0, { message: 'Daily price must be positive' })
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
  /** Accepts both StructuredSpecifications (from SpecificationsEditor) and flat Record format */
  specifications: z
    .union([
      z.record(z.string(), z.unknown()),
      z.object({
        groups: z.array(z.any()),
        highlights: z.array(z.any()).optional(),
        quickSpecs: z.array(z.any()).optional(),
      }),
    ])
    .optional(),
  customFields: z.record(z.unknown()).optional(),
  // Media fields
  featuredImageUrl: z
    .string()
    .url({ message: 'Featured image must be a valid URL' })
    .optional()
    .or(z.literal('')),
  galleryImageUrls: z
    .array(z.string().url({ message: 'Gallery images must be valid URLs' }))
    .optional(),
  videoUrl: z.string().url({ message: 'Video URL must be valid' }).optional().or(z.literal('')),
  // Translations
  translations: z.array(equipmentTranslationSchema).optional(),
  // Related/Recommended equipment
  relatedEquipmentIds: z
    .array(z.string().min(1, { message: 'Equipment ID cannot be empty' }))
    .optional(),
  // Box contents and buffer time
  tags: z.string().max(1000, { message: 'Tags is too long' }).optional(),
  boxContents: z.string().max(2000, { message: 'Box contents is too long' }).optional(),
  bufferTime: z.number().int().min(0, { message: 'Buffer time cannot be negative' }).optional(),
  bufferTimeUnit: z.enum(['hours', 'days']).optional(),
  /** Set when specs come from AI suggest — persisted on save */
  specConfidence: z.number().min(0).max(1).optional(),
  specLastInferredAt: z.coerce.date().optional(),
  specSource: z.enum(['import', 'ai-infer', 'url-extract', 'manual', 'migration']).optional(),
})

// Create schema with validation refine
export const createEquipmentSchema = baseEquipmentSchema.refine(
  (data) => {
    // At least one translation with Arabic preferred
    if (!data.translations || data.translations.length === 0) return false
    return true
  },
  {
    message: 'At least one translation is required (Arabic preferred)',
    path: ['translations'],
  }
)

// Update schema - make all fields optional and add id
export const updateEquipmentSchema = baseEquipmentSchema.partial().extend({
  id: z.string().min(1, { message: 'Equipment ID is required' }),
})

export type CreateEquipmentFormData = z.infer<typeof createEquipmentSchema>
export type UpdateEquipmentFormData = z.infer<typeof updateEquipmentSchema>
export type EquipmentTranslationFormData = z.infer<typeof equipmentTranslationSchema>
