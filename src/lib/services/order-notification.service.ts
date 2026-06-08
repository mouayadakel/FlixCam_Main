import { BusinessRecipientRole, UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { EmailService } from '@/lib/services/email.service'
import { SmsService } from '@/lib/services/sms.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { InvoiceService } from '@/lib/services/invoice.service'
import { PdfService } from '@/lib/services/pdf.service'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { parseSmsConfirmationOptIn, persistNotificationOptIns, customerAllowsWhatsApp } from '@/lib/checkout/notification-opt-in'

/** Twilio concatenated SMS limit ~1600 chars; keep margin */
const SMS_STAFF_ALERT_MAX_LEN = 1500

function truncateForSms(body: string): string {
  if (body.length <= SMS_STAFF_ALERT_MAX_LEN) return body
  return `${body.slice(0, SMS_STAFF_ALERT_MAX_LEN - 20)}\n…(تفاصيل إضافية بالبريد)`
}

const STAFF_FALLBACK_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.ACCOUNTANT,
  UserRole.CUSTOMER_SERVICE,
]

const BUSINESS_NOTIFICATION_ROLES = [
  'OWNER',
  'CO_OWNER',
  'GENERAL_MANAGER',
  'OPERATIONS_MANAGER',
  'WAREHOUSE_MANAGER',
  'CUSTOMER_SUPPORT',
  'ACCOUNTANT',
  'SALES_MANAGER',
  'MARKETING_MANAGER',
] as const

interface BookingNotificationContext {
  id: string
  bookingNumber: string
  status: string
  startDate: Date
  endDate: Date
  createdAt?: Date
  totalAmount: number
  vatAmount: number
  customerId: string
  deliveryAddress?: string | null
  checkoutFormData?: unknown
  customer: {
    id: string
    name: string | null
    email: string
    phone: string | null
    whatsappOptIn?: boolean | null
  }
  equipment?: Array<{
    quantity: number
    equipment?: {
      sku?: string | null
      model?: string | null
      nameEn?: string | null
      brand?: { name?: string | null } | null
      category?: { name?: string | null } | null
    } | null
  }>
}

interface NotificationRecipient {
  label: string
  userId?: string
  phone?: string
  email?: string
  staffRole?: UserRole
  businessRole?: BusinessRecipientRole
}

function getOrderCompletedEmailRecipientsFromEnv(): NotificationRecipient[] {
  const raw = process.env.ORDER_COMPLETED_NOTIFY_EMAILS
  if (!raw) return []

  const emails = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .filter((value) => value.includes('@'))

  return emails.map((email) => ({
    label: 'Order completed override',
    email,
  }))
}

function buildAdminPaymentConfirmedEmail(params: {
  bookingNumber: string
  bookingStatus: string
  startDate: Date
  endDate: Date
  customerLabel: string
  amount: number
}): { subject: string; html: string; bodyText: string } {
  const bookingPeriod = `${formatDate(params.startDate)} - ${formatDate(params.endDate)}`
  const subject = `تم إتمام الطلب ${params.bookingNumber} – FlixCam.rent`

  const bodyText = [
    `تم تأكيد الدفع للطلب ${params.bookingNumber}`,
    `العميل: ${params.customerLabel}`,
    `المبلغ المستلم: ${formatMoney(params.amount)}`,
  ].join('\n')

  const html = `
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0f766e;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">تم إكمال الطلب والدفع</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>تم تأكيد الدفع للطلب <strong>${escapeHtml(params.bookingNumber)}</strong>.</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
            <p><strong>العميل:</strong> ${escapeHtml(params.customerLabel)}</p>
            <p><strong>الفترة:</strong> ${escapeHtml(bookingPeriod)}</p>
            <p><strong>المبلغ المستلم:</strong> ${escapeHtml(formatMoney(params.amount))}</p>
            <p><strong>الحالة الحالية:</strong> ${escapeHtml(params.bookingStatus)}</p>
          </div>
        </div>
      </div>
    `

  return { subject, html, bodyText }
}

function formatMoney(value: number): string {
  return `${Math.round(value * 100) / 100} ر.س.`
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function dedupeByPhone<T extends { phone: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const row of rows) {
    const key = row.phone.replace(/\D/g, '')
    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(row)
  }

  return deduped
}

function dedupeByEmail<T extends { email: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const row of rows) {
    const key = row.email.trim().toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(row)
  }

  return deduped
}

async function loadBookingContext(bookingId: string): Promise<BookingNotificationContext | null> {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      deletedAt: null,
    },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      totalAmount: true,
      vatAmount: true,
      customerId: true,
      deliveryAddress: true,
      checkoutFormData: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsappOptIn: true,
        },
      },
      equipment: {
        where: { deletedAt: null },
        select: {
          quantity: true,
          equipment: {
            select: {
              sku: true,
              model: true,
              nameEn: true,
              brand: { select: { name: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!booking) {
    return null
  }

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    createdAt: booking.createdAt,
    totalAmount: Number(booking.totalAmount || 0),
    vatAmount: Number(booking.vatAmount || 0),
    customerId: booking.customerId,
    deliveryAddress: booking.deliveryAddress,
    checkoutFormData: booking.checkoutFormData,
    customer: booking.customer,
    equipment: booking.equipment,
  }
}

async function getAdminRecipients(): Promise<NotificationRecipient[]> {
  const [businessRecipients, staffUsers] = await Promise.all([
    prisma.businessRecipient.findMany({
      where: {
        isActive: true,
        role: {
          in: [...BUSINESS_NOTIFICATION_ROLES],
        },
        OR: [
          { whatsappNumber: { not: null } },
          { phone: { not: null } },
          { alternatePhone: { not: null } },
          { email: { not: null } },
          { alternateEmail: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        role: true,
        whatsappNumber: true,
        phone: true,
        email: true,
        alternateEmail: true,
        alternatePhone: true,
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        role: {
          in: STAFF_FALLBACK_ROLES,
        },
        OR: [
          { phone: { startsWith: '0' } },
          { phone: { startsWith: '+' } },
          { email: { contains: '@' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    }),
  ])

  const recipients = [
    ...businessRecipients
      .map((recipient) => ({
        phone: recipient.whatsappNumber || recipient.phone || recipient.alternatePhone || undefined,
        email: recipient.email || recipient.alternateEmail || undefined,
        label: recipient.name,
        businessRole: recipient.role,
      }))
      .filter((recipient) => recipient.phone || recipient.email),
    ...staffUsers
      .map((user) => ({
        phone: user.phone || undefined,
        email: user.email || undefined,
        label: user.name || user.email || user.id,
        userId: user.id,
        staffRole: user.role,
      }))
      .filter((recipient) => recipient.phone || recipient.email),
  ]

  return recipients
}

async function sendWhatsApp(
  recipients: NotificationRecipient[],
  body: string,
  context: { event: string; bookingId: string },
  options?: { smsFallback?: boolean }
): Promise<void> {
  const smsFallback = options?.smsFallback === true
  const smsBody = truncateForSms(body)

  const phoneRecipients = dedupeByPhone(
    recipients
      .filter((recipient): recipient is NotificationRecipient & { phone: string } => Boolean(recipient.phone))
      .map((recipient) => ({
        ...recipient,
        phone: recipient.phone!.trim(),
      }))
  )

  const waConfigured = WhatsAppService.isWhatsAppConfigured()

  if (!waConfigured && smsFallback && SmsService.isSmsConfigured()) {
    logger.info('Order notification: WhatsApp unavailable, using SMS fallback for staff', context)
    await Promise.allSettled(
      phoneRecipients.map(async (recipient) => {
        const smsResult = await SmsService.sendSmsText(recipient.phone, smsBody, {
          recipientUserId: recipient.userId,
          logToMessageLog: true,
        })
        if (!smsResult.ok) {
          logger.error('Order SMS staff fallback failed', {
            ...context,
            recipient: recipient.label,
            phone: recipient.phone,
            error: smsResult.error,
            twilioCode: smsResult.twilioCode,
          })
        }
      })
    )
    return
  }

  if (!waConfigured) {
    logger.info('Order notification skipped because WhatsApp is not configured', context)
    return
  }

  const results = await Promise.allSettled(
    phoneRecipients.map(async (recipient) => {
      const result = await WhatsAppService.sendWhatsAppText(recipient.phone, body, {
        recipientUserId: recipient.userId,
        logToMessageLog: true,
      })

      if (!result.ok) {
        logger.error('Order WhatsApp notification failed', {
          ...context,
          recipient: recipient.label,
          phone: recipient.phone,
          error: result.error,
        })
        if (smsFallback && SmsService.isSmsConfigured()) {
          const smsResult = await SmsService.sendSmsText(recipient.phone, smsBody, {
            recipientUserId: recipient.userId,
            logToMessageLog: true,
          })
          if (!smsResult.ok) {
            logger.error('Order SMS staff fallback after WhatsApp failed', {
              ...context,
              recipient: recipient.label,
              phone: recipient.phone,
              error: smsResult.error,
              twilioCode: smsResult.twilioCode,
            })
          }
        }
      }
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Order WhatsApp notification crashed', {
        ...context,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  }
}

async function sendEmail(
  recipients: NotificationRecipient[],
  subject: string,
  html: string,
  context: { event: string; bookingId: string }
): Promise<void> {
  const emailRecipients = dedupeByEmail(
    recipients
      .filter((recipient): recipient is NotificationRecipient & { email: string } => Boolean(recipient.email))
      .map((recipient) => ({
        ...recipient,
        email: recipient.email!.trim(),
      }))
  )

  const results = await Promise.allSettled(
    emailRecipients.map(async (recipient) => {
      const result = await EmailService.send({
        to: recipient.email,
        subject,
        html,
        recipientUserId: recipient.userId,
        logToMessageLog: true,
      })

      if (!result.ok) {
        logger.error('Order email notification failed', {
          ...context,
          recipient: recipient.label,
          email: recipient.email,
          error: result.error,
        })
      }
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Order email notification crashed', {
        ...context,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  }
}

function formatEquipmentSummary(
  equipment: NonNullable<BookingNotificationContext['equipment']> | undefined
): string | null {
  if (!equipment || equipment.length === 0) return null

  const lines = equipment
    .filter((row) => (row.quantity ?? 0) > 0)
    .map((row) => {
      const eq = row.equipment
      const brand = eq?.brand?.name?.trim()
      const model = eq?.model?.trim()
      const name = (eq?.nameEn ?? '').trim()
      const sku = eq?.sku?.trim()
      const label = [brand, model || name || undefined].filter(Boolean).join(' ')
      const suffix = sku ? ` (${sku})` : ''
      return `- ${row.quantity}× ${label || 'معدة'}${suffix}`
    })
    .filter(Boolean)

  if (lines.length === 0) return null
  return lines.join('\n')
}

function whatsappClickToChatLink(phone: string, prefillText: string): string {
  const digits = phone.replace(/\D/g, '')
  const text = encodeURIComponent(prefillText)
  return `https://wa.me/${digits}?text=${text}`
}

function isWarehouseRecipient(recipient: NotificationRecipient): boolean {
  if (recipient.staffRole === UserRole.WAREHOUSE_MANAGER) return true
  if (recipient.businessRole === 'WAREHOUSE_MANAGER') return true
  return false
}

export class OrderNotificationService {
  /**
   * Staff notifications (Admin / Warehouse Manager / etc.) when payment is confirmed.
   * Idempotent per booking, so we can call it from both webhook + success page without duplicates.
   */
  static async notifyStaffPaymentConfirmed(bookingId: string, amount: number): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking) return

    const adminRecipients = await getAdminRecipients()
    const extraEmailRecipients = getOrderCompletedEmailRecipientsFromEnv()

    if (adminRecipients.length === 0 && extraEmailRecipients.length === 0) {
      logger.warn('No staff recipients configured for payment confirmed alert', { bookingId })
      return
    }

    const existing = await prisma.event.findFirst({
      where: {
        eventName: 'notification.payment_success.staff',
        resourceType: 'booking',
        resourceId: bookingId,
        status: 'PROCESSED',
      },
      select: { id: true },
    })
    if (existing) return

    const customerLabel = booking.customer.name || booking.customer.email
    const customerPhone = booking.customer.phone?.trim()
    const equipmentSummary = formatEquipmentSummary(booking.equipment)
    const grandTotal = booking.totalAmount + booking.vatAmount
    const paidAt = formatDateTime(new Date())

    const customerChatLink =
      customerPhone && customerPhone.replace(/\D/g, '').length >= 9
        ? whatsappClickToChatLink(
            customerPhone,
            `مرحباً، بخصوص الطلب ${booking.bookingNumber} في FlixCam.rent`
          )
        : null

    const baseBodyLines = [
      `تم تأكيد الدفع للطلب ${booking.bookingNumber}`,
      `الوقت: ${paidAt}`,
      `العميل: ${customerLabel}`,
      customerPhone ? `رقم العميل: ${customerPhone}` : null,
      customerChatLink ? `واتساب العميل: ${customerChatLink}` : null,
      `الفترة: ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
      booking.deliveryAddress ? `العنوان: ${booking.deliveryAddress}` : null,
      equipmentSummary ? `الملخص:\n${equipmentSummary}` : null,
      `المبلغ المستلم: ${formatMoney(amount)}`,
      `الإجمالي (مع الضريبة): ${formatMoney(grandTotal)}`,
    ]
      .filter(Boolean)
    const baseBody = baseBodyLines.join('\n')

    const warehouseBody = [
      '🟦 تنبيه المستودع',
      'المطلوب: تجهيز المعدات + التأكد من التوفر + التواصل مع العميل لتأكيد الاستلام/التسليم.',
      baseBody,
    ].join('\n\n')

    const opsBody = [
      '🟩 تنبيه الإدارة / العمليات',
      'المطلوب: متابعة الطلب + تأكيد التفاصيل مع العميل + فتح مهمة للتجهيز.',
      baseBody,
    ].join('\n\n')

    const adminEmail = buildAdminPaymentConfirmedEmail({
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      customerLabel,
      amount,
    })

    await prisma.event.create({
      data: {
        eventName: 'notification.payment_success.staff',
        status: 'PROCESSED',
        processedAt: new Date(),
        resourceType: 'booking',
        resourceId: bookingId,
        payload: {
          bookingNumber: booking.bookingNumber,
          amount,
          sentAt: new Date().toISOString(),
        },
      },
    })

    if (adminRecipients.length > 0) {
      const warehouseRecipients = adminRecipients.filter(isWarehouseRecipient)
      const opsRecipients = adminRecipients.filter((r) => !isWarehouseRecipient(r))

      if (opsRecipients.length > 0) {
        await sendWhatsApp(opsRecipients, opsBody, { event: 'payment.success.staff.ops', bookingId }, {
          smsFallback: true,
        })
      }
      if (warehouseRecipients.length > 0) {
        await sendWhatsApp(warehouseRecipients, warehouseBody, { event: 'payment.success.staff.warehouse', bookingId }, {
          smsFallback: true,
        })
      }

      await sendEmail([...adminRecipients, ...extraEmailRecipients], adminEmail.subject, adminEmail.html, {
        event: 'payment.success.staff.email',
        bookingId,
      })
    } else if (extraEmailRecipients.length > 0) {
      await sendEmail(extraEmailRecipients, adminEmail.subject, adminEmail.html, {
        event: 'payment.success.staff.email',
        bookingId,
      })
    }
  }

  static async notifyPaymentConfirmedExtraEmails(bookingId: string, amount: number): Promise<void> {
    const extraEmailRecipients = getOrderCompletedEmailRecipientsFromEnv()
    if (extraEmailRecipients.length === 0) {
      return
    }

    const booking = await loadBookingContext(bookingId)
    if (!booking) {
      return
    }

    const customerLabel = booking.customer.name || booking.customer.email
    const adminEmail = buildAdminPaymentConfirmedEmail({
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      customerLabel,
      amount,
    })

    await sendEmail(extraEmailRecipients, adminEmail.subject, adminEmail.html, {
      event: 'payment.success.admin.email',
      bookingId,
    })
  }

  static async notifyAdminNewOrder(bookingId: string): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking) {
      return
    }

    const recipients = await getAdminRecipients()
    if (recipients.length === 0) {
      logger.warn('No admin WhatsApp recipients configured for new order alert', { bookingId })
      return
    }

    const customerLabel = booking.customer.name || booking.customer.email
    const grandTotal = booking.totalAmount + booking.vatAmount
    const body = [
      `طلب جديد ${booking.bookingNumber}`,
      `العميل: ${customerLabel}`,
      `الفترة: ${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`,
      `الإجمالي: ${formatMoney(grandTotal)}`,
      `الحالة: ${booking.status}`,
    ].join('\n')

    await sendWhatsApp(recipients, body, { event: 'booking.created', bookingId })
  }

  static async notifyPaymentConfirmed(bookingId: string, amount: number): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking) {
      return
    }

    await persistNotificationOptIns(booking.customerId, booking.checkoutFormData).catch((error) =>
      logger.error('Failed to persist notification opt-ins', { bookingId, error })
    )

    const customerPhone = booking.customer.phone?.trim()
    const customerEmail = booking.customer.email?.trim()
    const customerLabel = booking.customer.name || booking.customer.email
    const bookingPeriod = `${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`
    const customerEmailSubject = `تأكيد إتمام الطلب ${booking.bookingNumber} – FlixCam.rent`

    let customerBody = [
      `تم تأكيد دفع طلبك ${booking.bookingNumber}`,
      `المبلغ المستلم: ${formatMoney(amount)}`,
      `الحالة الحالية: ${booking.status}`,
    ].join('\n')

    const customerEmailHtml = `
      <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#111827;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">تم تأكيد طلبك</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
          <p>مرحباً ${escapeHtml(customerLabel)}،</p>
          <p>تم استلام الدفع بنجاح وإكمال الطلب <strong>${escapeHtml(booking.bookingNumber)}</strong>.</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
            <p><strong>الفترة:</strong> ${escapeHtml(bookingPeriod)}</p>
            <p><strong>المبلغ المستلم:</strong> ${escapeHtml(formatMoney(amount))}</p>
            <p><strong>الحالة الحالية:</strong> ${escapeHtml(booking.status)}</p>
          </div>
          <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">
            لأي استفسار: support@flixcam.rent
          </p>
        </div>
      </div>
    `

    // Generate Invoice PDF
    let invoiceUrl: string | undefined
    try {
      const invoice = await InvoiceService.autoGenerateForBooking(bookingId)
      const pdfBuffer = await PdfService.generateInvoicePdfBuffer({ invoice, locale: 'ar' })
      
      const invoiceDir = join(process.cwd(), 'public', 'uploads', 'invoices')
      if (!existsSync(invoiceDir)) {
        await mkdir(invoiceDir, { recursive: true })
      }
      const filename = `invoice-${invoice.invoiceNumber}.pdf`
      await writeFile(join(invoiceDir, filename), pdfBuffer)
      
      invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://flixcam.rent'}/uploads/invoices/${filename}`
    } catch (error) {
      logger.error('Failed to generate invoice PDF during payment confirmation', { bookingId, error })
    }

    if (invoiceUrl) {
      customerBody += `\n\nرابط الفاتورة: ${invoiceUrl}`
    }

    const smsOptIn = parseSmsConfirmationOptIn(booking.checkoutFormData)
    const whatsappOptIn = customerAllowsWhatsApp({
      checkoutFormData: booking.checkoutFormData,
      whatsappOptIn: booking.customer.whatsappOptIn,
    })

    if (customerPhone) {
      if (whatsappOptIn && WhatsAppService.isWhatsAppConfigured()) {
        await sendWhatsApp(
          [
            {
              phone: customerPhone,
              label: booking.customer.name || booking.customer.email,
              userId: booking.customer.id,
            },
          ],
          customerBody,
          { event: 'payment.success.customer', bookingId }
        )

        if (invoiceUrl) {
          await WhatsAppService.sendWhatsAppDocument(
            customerPhone,
            invoiceUrl,
            {
              caption: `فاتورة الطلب ${booking.bookingNumber}`,
              logToMessageLog: true,
              recipientUserId: booking.customer.id,
            }
          )
        }
      } else if (smsOptIn && SmsService.isSmsConfigured()) {
        const smsResult = await SmsService.sendSmsText(customerPhone, truncateForSms(customerBody), {
          recipientUserId: booking.customer.id,
          logToMessageLog: true,
        })
        if (!smsResult.ok) {
          logger.error('Payment confirmation SMS failed', {
            bookingId,
            error: smsResult.error,
            twilioCode: smsResult.twilioCode,
          })
        }
      }
    }

    if (customerEmail) {
      await sendEmail(
        [{ email: customerEmail, label: customerLabel, userId: booking.customer.id }],
        customerEmailSubject,
        customerEmailHtml,
        { event: 'payment.success.customer.email', bookingId }
      )
    }

    await this.notifyStaffPaymentConfirmed(bookingId, amount)
  }

  static async notifyPaymentFailed(bookingId: string, reason?: string): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking) {
      return
    }

    const adminRecipients = await getAdminRecipients()
    const customerPhone = booking.customer.phone?.trim()

    const customerBody = [
      `فشلت عملية الدفع لطلبك ${booking.bookingNumber}`,
      reason ? `السبب: ${reason}` : null,
      'يمكنك إعادة المحاولة من صفحة الطلب.',
    ]
      .filter(Boolean)
      .join('\n')

    const adminBody = [
      `فشل دفع للطلب ${booking.bookingNumber}`,
      `العميل: ${booking.customer.name || booking.customer.email}`,
      reason ? `السبب: ${reason}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    if (customerPhone) {
      await sendWhatsApp(
        [{ phone: customerPhone, label: booking.customer.name || booking.customer.email, userId: booking.customer.id }],
        customerBody,
        { event: 'payment.failed.customer', bookingId }
      )
    }

    if (adminRecipients.length > 0) {
      await sendWhatsApp(adminRecipients, adminBody, { event: 'payment.failed.admin', bookingId })
    }
  }

  static async notifyStatusChanged(bookingId: string, status: 'ACTIVE' | 'RETURNED'): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking || !booking.customer.phone?.trim()) {
      return
    }

    const message =
      status === 'ACTIVE'
        ? `تم تجهيز طلبك ${booking.bookingNumber} وأصبح نشطاً.`
        : `تم تحديث طلبك ${booking.bookingNumber} إلى حالة الإرجاع.`

    await sendWhatsApp(
      [
        {
          phone: booking.customer.phone,
          label: booking.customer.name || booking.customer.email,
          userId: booking.customer.id,
        },
      ],
      message,
      { event: `booking.status.${status.toLowerCase()}`, bookingId }
    )
  }

  static async notifyCancelled(bookingId: string, reason?: string): Promise<void> {
    const booking = await loadBookingContext(bookingId)
    if (!booking) {
      return
    }

    const adminRecipients = await getAdminRecipients()
    const customerPhone = booking.customer.phone?.trim()

    const customerBody = [
      `تم إلغاء طلبك ${booking.bookingNumber}`,
      reason ? `السبب: ${reason}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const adminBody = [
      `تم إلغاء الطلب ${booking.bookingNumber}`,
      `العميل: ${booking.customer.name || booking.customer.email}`,
      reason ? `السبب: ${reason}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    if (customerPhone) {
      await sendWhatsApp(
        [{ phone: customerPhone, label: booking.customer.name || booking.customer.email, userId: booking.customer.id }],
        customerBody,
        { event: 'booking.cancelled.customer', bookingId }
      )
    }

    if (adminRecipients.length > 0) {
      await sendWhatsApp(adminRecipients, adminBody, { event: 'booking.cancelled.admin', bookingId })
    }
  }
}
