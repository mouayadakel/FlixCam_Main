/**
 * Email service – sends transactional email via Resend.
 * No-op when RESEND_API_KEY is not set (e.g. dev without config).
 */

import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? 'noreply@flixcam.rent'
const fromName = process.env.RESEND_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'FlixCam.rent'

const resend = resendApiKey ? new Resend(resendApiKey) : null

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const baseUrl =
  process.env.NEXTAUTH_URL ??
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://localhost:3000'

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
   * Send contact form submission to admin
   */
  async sendContactFormNotification(data: {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
  }): Promise<{ ok: boolean; error?: string }> {
    if (!resend) return { ok: false, error: 'Email not configured' }
    const adminEmail =
      process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? process.env.RESEND_FROM ?? 'contact@flixcam.rent'
    const body = [
      `<p><strong>الاسم:</strong> ${escapeHtml(data.name)}</p>`,
      `<p><strong>البريد:</strong> ${escapeHtml(data.email)}</p>`,
      data.phone ? `<p><strong>الهاتف:</strong> ${escapeHtml(data.phone)}</p>` : '',
      `<p><strong>الموضوع:</strong> ${escapeHtml(data.subject)}</p>`,
      `<p><strong>الرسالة:</strong></p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`,
    ]
      .filter(Boolean)
      .join('')
    const { error } = await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: [adminEmail],
      replyTo: data.email,
      subject: `[FlixCam Contact] ${data.subject} – ${data.name}`,
      html: body,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  },

  /**
   * Send email verification link to /verify-email?token=...
   */
  /**
   * Send booking confirmation email (equipment or studio)
   */
  async sendBookingConfirmation(data: {
    to: string
    customerName: string
    bookingNumber: string
    bookingId: string
    startDate: Date
    endDate: Date
    totalAmount: number
    studioName?: string | null
    studioAddress?: string | null
    studioStartTime?: Date | null
    studioEndTime?: Date | null
    equipmentList?: string[]
  }): Promise<{ ok: boolean; error?: string }> {
    if (!resend) return { ok: false, error: 'Email not configured' }

    const portalUrl = `${baseUrl}/portal/bookings/${data.bookingId}`
    const isStudio = !!data.studioName

    const dateOpts: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

    let detailsHtml = ''
    if (isStudio && data.studioStartTime && data.studioEndTime) {
      detailsHtml = `
        <p><strong>الاستوديو:</strong> ${escapeHtml(data.studioName!)}</p>
        ${data.studioAddress ? `<p style="color:#666;font-size:13px">${escapeHtml(data.studioAddress)}</p>` : ''}
        <p><strong>التاريخ:</strong> ${data.studioStartTime.toLocaleDateString('ar-SA', dateOpts)}</p>
        <p><strong>الوقت:</strong> ${data.studioStartTime.toLocaleTimeString('ar-SA', timeOpts)} – ${data.studioEndTime.toLocaleTimeString('ar-SA', timeOpts)}</p>
      `
    } else {
      detailsHtml = `
        <p><strong>من:</strong> ${data.startDate.toLocaleDateString('ar-SA', dateOpts)}</p>
        <p><strong>إلى:</strong> ${data.endDate.toLocaleDateString('ar-SA', dateOpts)}</p>
      `
    }

    if (data.equipmentList?.length) {
      detailsHtml += `<p><strong>المعدات:</strong> ${data.equipmentList.map(escapeHtml).join('، ')}</p>`
    }

    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4F46E5;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">تم تأكيد حجزك ✓</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>مرحباً ${escapeHtml(data.customerName)},</p>
          <p>تم تأكيد حجزك بنجاح. إليك تفاصيل الحجز:</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
            <p><strong>رقم الحجز:</strong> ${escapeHtml(data.bookingNumber)}</p>
            ${detailsHtml}
            <p style="font-size:18px;margin-top:12px"><strong>الإجمالي:</strong> ${data.totalAmount.toLocaleString()} ر.س</p>
          </div>
          <p style="text-align:center;margin-top:24px">
            <a href="${portalUrl}" style="display:inline-block;background:#4F46E5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">عرض تفاصيل الحجز</a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
            إذا كان لديك أي استفسار، تواصل معنا عبر support@flixcam.rent
          </p>
        </div>
      </div>
    `

    const { error } = await resend.emails.send({
      from: `${fromName} <${from}>`,
      to: [data.to],
      subject: `تأكيد الحجز ${data.bookingNumber} – FlixCam.rent`,
      html,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  },

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
