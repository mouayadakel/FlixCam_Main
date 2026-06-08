/**
 * Email service – sends transactional email via:
 * 1) Resend (when RESEND_API_KEY exists)
 * 2) SMTP (when SMTP_* is configured)
 * 3) Local sendmail fallback (VPS mail server)
 */

import { Resend } from 'resend'
import { prisma } from '@/lib/db/prisma'
import { MessageLogStatus, NotificationChannel } from '@prisma/client'
import { PdfService } from '@/lib/services/pdf.service'
import { generatePromissoryNotePdf } from '@/lib/services/pdf/promissory-note-pdf'
import type { Invoice } from '@/lib/types/invoice.types'
import { AuditService } from '@/lib/services/audit.service'
import * as fs from 'fs'

const resendApiKey = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? 'no-reply@flixcam.rent'
const fromName = process.env.RESEND_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'FlixCam.rent'

const resend = resendApiKey ? new Resend(resendApiKey) : null
const smtpHost = process.env.SMTP_HOST?.trim()
const smtpPort = Number(process.env.SMTP_PORT ?? 587)
const smtpUser = process.env.SMTP_USER?.trim()
const smtpPassword = process.env.SMTP_PASSWORD?.trim()

type EmailAttachment = { filename: string; content: Buffer | string }
type EmailSenderConfig = {
  fromAddress: string
  fromName: string
  replyTo?: string
}

function isLikelyPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const v = value.toLowerCase()
  return (
    v.includes('your-') ||
    v.includes('example') ||
    v === 'your-email@gmail.com' ||
    v === 'your-app-password'
  )
}

function canUseSmtp(): boolean {
  if (!smtpHost || !smtpPort) return false
  const isLocal = smtpHost === '127.0.0.1' || smtpHost === 'localhost'
  if (isLocal) return true
  const hasCreds = !isLikelyPlaceholder(smtpUser) && !isLikelyPlaceholder(smtpPassword)
  return hasCreds
}

async function getEmailSenderConfig(): Promise<EmailSenderConfig> {
  const defaults: EmailSenderConfig = {
    fromAddress: from,
    fromName,
  }

  try {
    const config = await prisma.messagingChannelConfig.findUnique({
      where: { channel: NotificationChannel.EMAIL },
      select: { config: true },
    })
    const stored =
      config?.config && typeof config.config === 'object' && !Array.isArray(config.config)
        ? (config.config as Record<string, unknown>)
        : {}

    const fromAddress =
      typeof stored.fromAddress === 'string' && stored.fromAddress.trim().length > 0
        ? stored.fromAddress.trim()
        : defaults.fromAddress
    const resolvedFromName =
      typeof stored.fromName === 'string' && stored.fromName.trim().length > 0
        ? stored.fromName.trim()
        : defaults.fromName
    const replyTo =
      typeof stored.replyTo === 'string' && stored.replyTo.trim().length > 0
        ? stored.replyTo.trim()
        : undefined

    return {
      fromAddress,
      fromName: resolvedFromName,
      ...(replyTo ? { replyTo } : {}),
    }
  } catch {
    return defaults
  }
}

async function sendViaSmtp(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
  attachments?: EmailAttachment[]
  sender: EmailSenderConfig
}): Promise<{ ok: boolean; error?: string }> {
  const nodemailer = await import('nodemailer')
  const isLocal = smtpHost === '127.0.0.1' || smtpHost === 'localhost'
  const transporter = nodemailer.createTransport(
    (canUseSmtp()
      ? {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          ...(isLocal
            ? {}
            : {
                auth: {
                  user: smtpUser,
                  pass: smtpPassword,
                },
              }),
        }
      : {
          sendmail: true,
          newline: 'unix',
          path: '/usr/sbin/sendmail',
        }) as unknown as Parameters<typeof nodemailer.createTransport>[0]
  )

  await transporter.sendMail({
    from: `${params.sender.fromName} <${params.sender.fromAddress}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    attachments: params.attachments,
  })
  return { ok: true }
}

async function sendEmailInternal(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
  attachments?: EmailAttachment[]
}): Promise<{ ok: boolean; error?: string }> {
  const sender = await getEmailSenderConfig()
  const replyTo = params.replyTo ?? sender.replyTo

  if (resend) {
    const { error } = await resend.emails.send({
      from: `${sender.fromName} <${sender.fromAddress}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      replyTo,
      attachments: params.attachments,
    })
    if (!error) return { ok: true }
    // fall through to SMTP/sendmail fallback when Resend fails
  }

  try {
    return await sendViaSmtp({
      ...params,
      replyTo,
      sender,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `Email provider unavailable: ${message}` }
  }
}

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
  async sendWelcomeCustomerEmail(data: {
    to: string
    customerName?: string | null
  }): Promise<{ ok: boolean; error?: string }> {
    const customerName = (data.customerName || '').trim() || 'عميلنا العزيز'
    const html = `
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4F46E5;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">رسالة ترحيب</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>مرحباً ${escapeHtml(customerName)}،</p>
          <p>أهلاً بك في <strong>FlixCam.rent</strong>.</p>
          <p>تم إنشاء حسابك بنجاح ويمكنك الآن إتمام الحجز وإدارة طلباتك بسهولة.</p>
          <p style="text-align:center;margin-top:24px">
            <a href="${baseUrl}/portal/dashboard" style="display:inline-block;background:#4F46E5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold">الدخول إلى حسابي</a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
            لأي استفسار: support@flixcam.rent
          </p>
        </div>
      </div>
    `

    const result = await this.send({
      to: data.to,
      subject: 'رسالة ترحيب - FlixCam.rent',
      html,
    })

    await AuditService.log({
      action: result.ok ? 'email.welcome.sent' : 'email.welcome.failed',
      resourceType: 'email',
      metadata: {
        to: data.to,
        customerName: customerName || null,
        error: result.error ?? null,
      },
    })

    return result
  },

  async sendInvoiceCreatedEmail(input: {
    invoiceId: string
  }): Promise<{ ok: boolean; error?: string }> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    })

    if (!invoice?.customer?.email) {
      return { ok: false, error: 'Customer email not found' }
    }

    const invoicePdfInvoice: Invoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      customerId: invoice.customerId,
      type: invoice.type.toLowerCase() as Invoice['type'],
      status: invoice.status.toLowerCase().replace('_', '_') as Invoice['status'],
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      subtotal: Number(invoice.subtotal ?? 0),
      discount: invoice.discount ? Number(invoice.discount) : undefined,
      vatAmount: Number(invoice.vatAmount ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      paidAmount: Number(invoice.paidAmount ?? 0),
      remainingAmount: Number(invoice.remainingAmount ?? 0),
      items: (invoice.items as unknown as Invoice['items']) ?? [],
      notes: invoice.notes ?? undefined,
      paymentTerms: invoice.paymentTerms ?? undefined,
      customer: invoice.customer ?? undefined,
      booking: invoice.booking ?? undefined,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }

    const invoiceBuffer = await PdfService.generateInvoicePdfBuffer({
      invoice: invoicePdfInvoice,
      locale: 'ar',
      includeZatcaQr: true,
    })
    const customerName = invoice.customer.name?.trim() || 'عميلنا العزيز'
    const bookingRef = invoice.booking?.bookingNumber
      ? ` للحجز <strong>${escapeHtml(invoice.booking.bookingNumber)}</strong>`
      : ''

    const html = `
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4F46E5;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">فاتورتك من FlixCam</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>مرحباً ${escapeHtml(customerName)}،</p>
          <p>مرفق فاتورتك رقم <strong>${escapeHtml(invoice.invoiceNumber)}</strong>${bookingRef}.</p>
          <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
            لأي استفسار: support@flixcam.rent
          </p>
        </div>
      </div>
    `

    const result = await sendEmailInternal({
      to: invoice.customer.email,
      subject: `فاتورة ${invoice.invoiceNumber} – FlixCam.rent`,
      html,
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          content: invoiceBuffer,
        },
      ],
    })

    await AuditService.log({
      action: result.ok ? 'email.invoice.sent' : 'email.invoice.failed',
      resourceType: 'invoice',
      resourceId: invoice.id,
      metadata: {
        to: invoice.customer.email,
        invoiceNumber: invoice.invoiceNumber,
        error: result.error ?? null,
      },
    })

    return result
  },

  async sendPaymentDocumentsEmail(input: {
    bookingId: string
  }): Promise<{ ok: boolean; error?: string }> {
    const logPaymentDocumentsAudit = async (
      result: { ok: boolean; error?: string },
      metadata: Record<string, unknown>
    ) => {
      await AuditService.log({
        action: result.ok ? 'email.payment_documents.sent' : 'email.payment_documents.failed',
        resourceType: 'booking',
        resourceId: input.bookingId,
        metadata: {
          ...metadata,
          error: result.error ?? null,
        },
      })
    }

    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, deletedAt: null },
      select: {
        id: true,
        bookingNumber: true,
        customer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    if (!booking?.customer?.email) {
      const result = { ok: false, error: 'Customer email not found' }
      await logPaymentDocumentsAudit(result, {
        to: null,
        bookingNumber: booking?.bookingNumber ?? null,
        invoiceNumber: null,
        attachments: [],
        hasPromissoryNote: false,
      })
      return result
    }

    const invoice = await prisma.invoice.findFirst({
      where: { bookingId: booking.id, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
            companyName: true,
            billingAddress: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!invoice) {
      const result = { ok: false, error: 'Invoice not found for booking' }
      await logPaymentDocumentsAudit(result, {
        to: booking.customer.email,
        bookingNumber: booking.bookingNumber,
        invoiceNumber: null,
        attachments: [],
        hasPromissoryNote: false,
      })
      return result
    }

    const invoicePdfInvoice: Invoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      customerId: invoice.customerId,
      type: invoice.type.toLowerCase() as Invoice['type'],
      status: invoice.status.toLowerCase().replace('_', '_') as Invoice['status'],
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      subtotal: Number(invoice.subtotal ?? 0),
      discount: invoice.discount ? Number(invoice.discount) : undefined,
      vatAmount: Number(invoice.vatAmount ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      paidAmount: Number(invoice.paidAmount ?? 0),
      remainingAmount: Number(invoice.remainingAmount ?? 0),
      items: (invoice.items as unknown as Invoice['items']) ?? [],
      notes: invoice.notes ?? undefined,
      paymentTerms: invoice.paymentTerms ?? undefined,
      customer: invoice.customer ?? undefined,
      booking: invoice.booking ?? undefined,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }

    const invoiceBuffer = await PdfService.generateInvoicePdfBuffer({
      invoice: invoicePdfInvoice,
      locale: 'ar',
      includeZatcaQr: true,
    })
    const attachments: EmailAttachment[] = [
      {
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: invoiceBuffer,
      },
    ]

    const promissoryNote = await prisma.promissoryNote.findFirst({
      where: {
        bookingId: booking.id,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        noteNumber: true,
        pdfUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (promissoryNote) {
      let promissoryBuffer: Buffer
      if (promissoryNote.pdfUrl && fs.existsSync(promissoryNote.pdfUrl)) {
        promissoryBuffer = fs.readFileSync(promissoryNote.pdfUrl)
      } else {
        promissoryBuffer = await generatePromissoryNotePdf(promissoryNote.id)
      }

      attachments.push({
        filename: `promissory-note-${promissoryNote.noteNumber}.pdf`,
        content: promissoryBuffer,
      })
    }

    const customerName = booking.customer.name?.trim() || 'عميلنا العزيز'
    const html = `
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4F46E5;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">تم استلام الدفع بنجاح</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>مرحباً ${escapeHtml(customerName)}،</p>
          <p>شكراً لك. تم استلام دفعتك للحجز <strong>${escapeHtml(booking.bookingNumber)}</strong>.</p>
          <p>أرفقنا لك المستندات التالية:</p>
          <ul>
            <li>الفاتورة (Invoice)</li>
            ${promissoryNote ? '<li>سند أمر</li>' : ''}
          </ul>
          <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
            لأي استفسار: support@flixcam.rent
          </p>
        </div>
      </div>
    `

    const result = await this.send({
      to: booking.customer.email,
      subject: `فاتورتك ومستندات الحجز ${booking.bookingNumber} - FlixCam.rent`,
      html,
      attachments,
      templateId: 'payment-documents',
    })

    await logPaymentDocumentsAudit(result, {
      to: booking.customer.email,
      bookingNumber: booking.bookingNumber,
      invoiceNumber: invoice.invoiceNumber,
      attachments: attachments.map((a) => a.filename),
      hasPromissoryNote: Boolean(promissoryNote),
    })

    return result
  },

  /**
   * Send password reset email with link to /reset-password?token=...
   */
  async sendPasswordReset(to: string, token: string): Promise<{ ok: boolean; error?: string }> {
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
    return sendEmailInternal({
      to,
      subject: 'Reset your password – FlixCam.rent',
      html: `
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    })
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
    /** Server-only override; else public contact email; never use RESEND_FROM (that is the sender). */
    const adminEmail =
      process.env.CONTACT_FORM_TO?.trim() ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
      'info@flixcam.rent'
    const body = [
      `<p><strong>الاسم:</strong> ${escapeHtml(data.name)}</p>`,
      `<p><strong>البريد:</strong> ${escapeHtml(data.email)}</p>`,
      data.phone ? `<p><strong>الهاتف:</strong> ${escapeHtml(data.phone)}</p>` : '',
      `<p><strong>الموضوع:</strong> ${escapeHtml(data.subject)}</p>`,
      `<p><strong>الرسالة:</strong></p><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`,
    ]
      .filter(Boolean)
      .join('')
    return sendEmailInternal({
      to: adminEmail,
      subject: `[FlixCam Contact] ${data.subject} – ${data.name}`,
      html: body,
      replyTo: data.email,
    })
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
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
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

    return sendEmailInternal({
      to: data.to,
      subject: `تأكيد الحجز ${data.bookingNumber} – FlixCam.rent`,
      html,
    })
  },

  async sendVerificationEmail(to: string, token: string): Promise<{ ok: boolean; error?: string }> {
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`
    return sendEmailInternal({
      to,
      subject: 'Verify your email – FlixCam.rent',
      html: `
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    })
  },

  /**
   * Send generic email (for notification service / templates). Optionally log to MessageLog.
   */
  async send(params: {
    to: string
    subject: string
    html: string
    attachments?: Array<{ filename: string; content: Buffer | string }>
    replyTo?: string
    recipientUserId?: string
    templateId?: string
    logToMessageLog?: boolean
  }): Promise<{ ok: boolean; error?: string }> {
    const result = await sendEmailInternal({
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      attachments: params.attachments,
    })

    if (params.logToMessageLog !== false) {
      await prisma.messageLog.create({
        data: {
          channel: NotificationChannel.EMAIL,
          recipientEmail: params.to,
          subject: params.subject,
          body: params.html,
          status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
          errorMessage: result.error ?? null,
          sentAt: result.ok ? new Date() : null,
          templateId: params.templateId ?? null,
          recipientUserId: params.recipientUserId ?? null,
        },
      })
    }

    return result
  },
}
