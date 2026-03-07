import { z } from 'zod'

export const createBookingPromissoryNoteSchema = z.object({
  bookingId: z.string().cuid(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'يجب الموافقة على الشروط' }) }),
  damagePolicyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'يجب الموافقة على سياسة الأضرار' }),
  }),
  lateFeesAccepted: z.literal(true, {
    errorMap: () => ({ message: 'يجب الموافقة على غرامات التأخير' }),
  }),
  signatureData: z.string().min(1, 'التوقيع مطلوب'),
})

export type CreateBookingPromissoryNoteInput = z.infer<typeof createBookingPromissoryNoteSchema>
