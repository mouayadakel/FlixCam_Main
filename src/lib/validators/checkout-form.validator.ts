/**
 * Zod schemas for checkout form config CRUD (sections + fields).
 */

import { z } from 'zod'

const FIELD_TYPES = [
  'text',
  'number',
  'phone',
  'email',
  'checkbox',
  'file',
  'dropdown',
  'date',
  'map',
  'multi_select',
  'radio',
  'textarea',
  'signature',
] as const

const optionSchema = z.object({
  valueEn: z.string(),
  valueAr: z.string().optional(),
})

export const createSectionSchema = z.object({
  nameEn: z.string().min(1, 'Name (EN) required'),
  nameAr: z.string().min(1, 'Name (AR) required'),
  step: z.number().int().min(1).max(3),
  sortOrder: z.number().int().min(0).optional().default(0),
  isSystem: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

export const updateSectionSchema = createSectionSchema.partial()

export const createFieldSchema = z.object({
  sectionId: z.string().cuid(),
  fieldKey: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'fieldKey must be snake_case (e.g. receiver_name)'),
  labelEn: z.string().min(1, 'Label (EN) required'),
  labelAr: z.string().min(1, 'Label (AR) required'),
  placeholderEn: z.string().optional(),
  placeholderAr: z.string().optional(),
  fieldType: z.enum(FIELD_TYPES),
  isRequired: z.boolean().optional().default(false),
  isSystem: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
  options: z.array(optionSchema).optional(),
  conditionFieldKey: z.string().optional(),
  conditionValue: z.string().optional(),
  defaultValue: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateFieldSchema = createFieldSchema
  .omit({ sectionId: true })
  .partial()
  .extend({
    sectionId: z.string().cuid().optional(),
  })

export type CreateSectionInput = z.infer<typeof createSectionSchema>
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>
export type CreateFieldInput = z.infer<typeof createFieldSchema>
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>
