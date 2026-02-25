/**
 * Zod schemas for receiver (saved "someone else" recipient) data.
 */

import { z } from 'zod'

export const createReceiverSchema = z.object({
  name: z.string().min(1, 'Name required'),
  idNumber: z.string().min(1, 'ID number required'),
  phone: z.string().min(1, 'Phone required'),
  idPhotoUrl: z.string().min(1, 'ID photo URL required'),
})

export const updateReceiverSchema = createReceiverSchema.partial()

export type CreateReceiverInput = z.infer<typeof createReceiverSchema>
export type UpdateReceiverInput = z.infer<typeof updateReceiverSchema>
