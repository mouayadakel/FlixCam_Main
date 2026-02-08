/**
 * @file auth.validator.ts
 * @description Zod validation schemas for authentication
 * @module lib/validators
 */

import * as z from 'zod'

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'البريد الإلكتروني غير صالح' }),
  password: z
    .string()
    .min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    .max(100, { message: 'كلمة المرور طويلة جداً' }),
})

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'البريد الإلكتروني غير صالح' }),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    .max(100, { message: 'كلمة المرور طويلة جداً' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'كلمة المرور يجب أن تحتوي على حرف صغير، حرف كبير، ورقم',
    }),
  confirmPassword: z.string(),
  token: z.string().min(1, { message: 'رمز إعادة التعيين مطلوب' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

/** Normalize Saudi phone to E.164 (966XXXXXXXXX). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('5')) return `966${digits}`
  if (digits.length === 10 && digits.startsWith('05')) return `966${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('966')) return digits
  return digits
}

/**
 * Send OTP (Phase 3.2 – deferred registration).
 */
export const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(1, { message: 'رقم الجوال مطلوب' })
    .transform(normalizePhone)
    .refine((v) => /^966[0-9]{9}$/.test(v), { message: 'رقم جوال سعودي غير صالح' }),
})

/**
 * Verify OTP and get one-time login token (Phase 3.2).
 */
export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(1)
    .transform(normalizePhone)
    .refine((v) => /^966[0-9]{9}$/.test(v)),
  code: z.string().length(6, { message: 'الرمز 6 أرقام' }),
})

/**
 * Deferred registration (email + password) at checkout (Phase 3.2).
 */
export const deferredRegisterSchema = z.object({
  email: z.string().min(1, { message: 'البريد الإلكتروني مطلوب' }).email({ message: 'البريد غير صالح' }),
  password: z.string().min(6, { message: 'كلمة المرور 6 أحرف على الأقل' }).max(100),
  name: z.string().max(100).optional(),
})

/**
 * Register page form schema (includes confirm password).
 */
export const registerFormSchema = deferredRegisterSchema.extend({
  confirmPassword: z.string().min(1, { message: 'تأكيد كلمة المرور مطلوب' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type DeferredRegisterInput = z.infer<typeof deferredRegisterSchema>
export type RegisterFormData = z.infer<typeof registerFormSchema>
