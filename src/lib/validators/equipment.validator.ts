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
  name: z.string().min(1, { message: 'Name is required' }).max(200, { message: 'Name is too long' }),
  description: z.string().max(5000, { message: 'Description is too long' }).optional(),
  shortDescription: z.string().max(500, { message: 'Short description is too long' }).optional(),
  seoTitle: z.string().max(200, { message: 'SEO title is too long' }).optional(),
  seoDescription: z.string().max(500, { message: 'SEO description is too long' }).optional(),
  seoKeywords: z.string().max(500, { message: 'SEO keywords is too long' }).optional(),
})

// Base schema without refine (so we can use .partial() on it)
const baseEquipmentSchema = z.object({
  sku: z.string().min(1, { message: 'SKU is required' }).max(100, { message: 'SKU is too long' }),
  model: z.string().max(200, { message: 'Model name is too long' }).optional(),
  categoryId: z.string().min(1, { message: 'Category is required' }),
  brandId: z.string().optional(),
  condition: equipmentConditionSchema.optional(),
  quantityTotal: z.number().int().min(1, { message: 'Quantity must be at least 1' }).optional(),
  quantityAvailable: z.number().int().min(0, { message: 'Available quantity cannot be negative' }).optional(),
  dailyPrice: z.number().min(0, { message: 'Daily price must be positive' }),
  weeklyPrice: z.number().min(0, { message: 'Weekly price must be positive' }).optional(),
  monthlyPrice: z.number().min(0, { message: 'Monthly price must be positive' }).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  warehouseLocation: z.string().max(200, { message: 'Warehouse location is too long' }).optional(),
  barcode: z.string().max(100, { message: 'Barcode is too long' }).optional(),
  specifications: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  // Media fields
  featuredImageUrl: z.string().url({ message: 'Featured image must be a valid URL' }).optional().or(z.literal('')),
  galleryImageUrls: z.array(z.string().url({ message: 'Gallery images must be valid URLs' })).optional(),
  videoUrl: z.string().url({ message: 'Video URL must be valid' }).optional().or(z.literal('')),
  // Translations
  translations: z.array(equipmentTranslationSchema).optional(),
  // Related/Recommended equipment
  relatedEquipmentIds: z.array(z.string().min(1, { message: 'Equipment ID cannot be empty' })).optional(),
  // Box contents and buffer time
  boxContents: z.string().max(2000, { message: 'Box contents is too long' }).optional(),
  bufferTime: z.number().int().min(0, { message: 'Buffer time cannot be negative' }).optional(),
  bufferTimeUnit: z.enum(['hours', 'days']).optional(),
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
