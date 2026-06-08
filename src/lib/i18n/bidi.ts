/**
 * Bidi embedding for technical strings (email, phone, OTP, SKU, URLs).
 * Use dir={EMBED_LTR} instead of dir="rtl" so document default stays RTL (Arabic).
 */
export const EMBED_LTR = 'ltr' as const
