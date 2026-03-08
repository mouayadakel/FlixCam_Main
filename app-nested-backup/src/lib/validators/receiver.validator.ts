/**
 * Zod schemas for receiver (saved "someone else" recipient) data.
 */

import { z } from 'zod'

const SAUDI_PHONE_REGEX = /^(05\d{8}|9665\d{8})$/

export const createReceiverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  idNumber: z.string().min(1, 'ID number required'),
  phone: z.string().regex(SAUDI_PHONE_REGEX, 'Invalid Saudi phone number'),
  idPhotoUrl: z.string().min(1, 'ID photo URL required'),
  isDefault: z.boolean().optional(),
})

export const updateReceiverSchema = createReceiverSchema.partial()

export type CreateReceiverInput = z.infer<typeof createReceiverSchema>
export type UpdateReceiverInput = z.infer<typeof updateReceiverSchema>
