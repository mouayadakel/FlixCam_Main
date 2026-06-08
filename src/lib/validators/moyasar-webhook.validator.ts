/**
 * @file moyasar-webhook.validator.ts
 * @description Zod schema for Moyasar webhook HTTP payloads.
 * @module lib/validators/moyasar-webhook.validator
 */

import { z } from 'zod'

// [FIX 6]
export const MoyasarWebhookSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().min(1, 'type required'),
    secret_token: z.string().optional(),
    data: z
      .object({
        id: z.string().min(1, 'data.id required'),
        amount: z.number().optional(),
        currency: z.string().optional(),
        metadata: z
          .object({
            booking_id: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type MoyasarWebhookValidated = z.infer<typeof MoyasarWebhookSchema>
