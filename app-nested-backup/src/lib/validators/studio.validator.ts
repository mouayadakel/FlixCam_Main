/**
 * @file studio.validator.ts
 * @description Zod schemas for studio API payloads
 * @module lib/validators/studio.validator
 */

import { z } from 'zod'

const optionalString = z.string().max(2000).optional().nullable().or(z.literal(''))

export const createStudioSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  hourlyRate: z.number().min(0, 'Hourly rate must be non-negative'),
  setupBuffer: z.number().int().min(0).max(480).optional(),
  cleaningBuffer: z.number().int().min(0).max(480).optional(),
  resetTime: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
})

export const updateStudioSchema = createStudioSchema.partial()

/** CMS update schema - all studio fields manageable from CMS */
export const updateStudioCmsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: optionalString,
  capacity: z.number().int().min(0).optional().nullable(),
  hourlyRate: z.number().min(0).optional(),
  setupBuffer: z.number().int().min(0).max(480).optional(),
  cleaningBuffer: z.number().int().min(0).max(480).optional(),
  resetTime: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
  areaSqm: z.number().int().min(0).optional().nullable(),
  studioType: optionalString,
  bestUse: optionalString,
  availabilityConfidence: z.enum(['available_now', 'requires_review']).optional().nullable(),
  videoUrl: optionalString,
  galleryDisclaimer: optionalString,
  address: optionalString,
  googleMapsUrl: optionalString,
  arrivalTimeFromCenter: optionalString,
  parkingNotes: optionalString,
  slotDurationMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  dailyRate: z.number().min(0).optional().nullable(),
  minHours: z.number().int().min(0).max(24).optional(),
  durationOptions: z.string().optional().nullable(),
  bookingDisclaimer: optionalString,
  vatIncluded: z.boolean().optional(),
  whatsIncluded: z.string().optional().nullable(),
  notIncluded: z.string().optional().nullable(),
  hasElectricity: z.boolean().optional(),
  hasAC: z.boolean().optional(),
  hasChangingRooms: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  rulesText: optionalString,
  smokingPolicy: optionalString,
  foodPolicy: optionalString,
  equipmentCarePolicy: optionalString,
  cancellationPolicyShort: optionalString,
  cancellationPolicyLink: optionalString,
  heroTagline: optionalString,
  reviewsText: optionalString,
  whatsappNumber: optionalString,
  bookingCountDisplay: z.number().int().min(0).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  discountMessage: optionalString,
  discountActive: z.boolean().optional(),
  metaTitle: optionalString,
  metaDescription: optionalString,
})

export type CreateStudioInput = z.infer<typeof createStudioSchema>
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>
export type UpdateStudioCmsInput = z.infer<typeof updateStudioCmsSchema>
