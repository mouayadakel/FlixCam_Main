/**
 * Email service – sends transactional email via Resend.
 * No-op when RESEND_API_KEY is not set (e.g. dev without config).
 */

import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? 'noreply@flixcam.rent'
const fromName = process.env.RESEND_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'FlixCam.rent'

const resend = resendApiKey ? new Resend(resendApiKey) : null

const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const EmailService = {
  /**
   * Send password reset email with link to /reset-password?token=...
   */
  async sendPasswordReset(to: string, token: string): Promise<{ ok: boolean; error?: string }> {
    if (!resend) return { ok: false, error: 'Email not configured' }
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
    const { error } = await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: [to],
      subject: 'Reset your password – FlixCam.rent',
      html: `
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  },

  /**
   * Send email verification link to /verify-email?token=...
   */
  async sendVerificationEmail(to: string, token: string): Promise<{ ok: boolean; error?: string }> {
    if (!resend) return { ok: false, error: 'Email not configured' }
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`
    const { error } = await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: [to],
      subject: 'Verify your email – FlixCam.rent',
      html: `
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  },
}
