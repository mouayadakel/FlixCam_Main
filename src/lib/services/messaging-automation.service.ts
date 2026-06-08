/**
 * @file messaging-automation.service.ts
 * @description Event-to-notification automation: rules, templates, recipient routing.
 * @module lib/services/messaging-automation
 */

import { NotificationChannel } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { NotificationService } from '@/lib/services/notification.service'
import { enqueueNotification } from '@/lib/services/notification-queue.service'
import { renderTemplate } from '@/lib/services/template-renderer.service'
import { CouponService } from '@/lib/services/coupon.service'

const EVENT_TO_TRIGGER: Record<string, string> = {
  'booking.created': 'BOOKING_CREATED',
  'booking.confirmed': 'BOOKING_CONFIRMED',
  'booking.cancelled': 'BOOKING_CANCELLED',
  'booking.updated': 'BOOKING_UPDATED',
  'booking.risk_check': 'BOOKING_REMINDER',
  'payment.success': 'PAYMENT_RECEIVED',
  'payment.failed': 'PAYMENT_FAILED',
  'payment.refunded': 'REFUND_PROCESSED',
  'contract.signed': 'REVIEW_REQUEST',
  'reminder.pickup_24h': 'PICKUP_REMINDER_24H',
  'reminder.pickup_3h': 'PICKUP_REMINDER_3H',
  'reminder.return_24h': 'RETURN_REMINDER_24H',
  'reminder.return_6h': 'RETURN_REMINDER_6H',
  'reminder.late_return': 'LATE_RETURN_WARNING',
  'marketing.event.created': 'MARKETING_EVENT',
  'user.whale_sign_in': 'WHALE_SIGN_IN',
  'user.referral_signup': 'REFERRAL_SIGNUP',
  'delivery.status_updated': 'DELIVERY_UPDATED',
  'cart.abandoned': 'CART_ABANDONED',
  'review.request': 'REVIEW_REQUEST',
}

type RuleChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP'
type RuleRecipientType = 'CUSTOMER' | 'BUSINESS' | 'WAREHOUSE' | 'ALL'

interface LoadedCustomer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

interface LoadedBooking {
  id: string
  bookingNumber: string
  status: string
  startDate: Date
  endDate: Date
  totalAmount: number
  vatAmount: number
  depositAmount: number | null
  customerId: string
  receiverName: string | null
  receiverPhone: string | null
  deliveryAddress: string | null
  preferredTimeSlot: string | null
  notes: string | null
  customer: LoadedCustomer | null
  equipmentSummary: string
  equipmentCount: number
}

interface InternalRecipient {
  id: string
  name: string
  role: string
  email: string | null
  alternateEmail: string | null
  phone: string | null
  alternatePhone: string | null
  whatsappNumber: string | null
  preferredChannel: string | null
  receiveTriggers: unknown
  excludeTriggers: unknown
}

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    const parsed = value.toNumber()
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function getCustomerLabel(customer: LoadedCustomer | null, booking: LoadedBooking | null): string {
  return (
    customer?.name?.trim() ||
    booking?.receiverName?.trim() ||
    customer?.email?.trim() ||
    customer?.phone?.trim() ||
    'Customer'
  )
}

function getInternalEmail(recipient: InternalRecipient): string | null {
  return recipient.email?.trim() || recipient.alternateEmail?.trim() || null
}

function getInternalPhone(recipient: InternalRecipient, channel: RuleChannel): string | null {
  if (channel === 'WHATSAPP') {
    return (
      recipient.whatsappNumber?.trim() ||
      recipient.phone?.trim() ||
      recipient.alternatePhone?.trim() ||
      null
    )
  }

  if (channel === 'SMS') {
    return (
      recipient.phone?.trim() ||
      recipient.alternatePhone?.trim() ||
      recipient.whatsappNumber?.trim() ||
      null
    )
  }

  return null
}

function isRecipientSubscribedToTrigger(recipient: InternalRecipient, trigger: string): boolean {
  const include = normalizeStringArray(recipient.receiveTriggers)
  if (include.length > 0 && !include.includes(trigger)) {
    return false
  }

  const exclude = normalizeStringArray(recipient.excludeTriggers)
  if (exclude.includes(trigger)) {
    return false
  }

  return true
}

function canReceiveViaChannel(recipient: InternalRecipient, channel: RuleChannel): boolean {
  if (channel === 'EMAIL') return Boolean(getInternalEmail(recipient))
  if (channel === 'WHATSAPP' || channel === 'SMS') return Boolean(getInternalPhone(recipient, channel))
  return false
}

function resolveRecipientChannels(recipient: InternalRecipient, channels: RuleChannel[]): RuleChannel[] {
  const preferred = recipient.preferredChannel as RuleChannel | null
  if (preferred && channels.includes(preferred) && canReceiveViaChannel(recipient, preferred)) {
    return [preferred]
  }

  return channels
}

async function loadBooking(bookingId: string): Promise<LoadedBooking | null> {
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
      totalAmount: true,
      vatAmount: true,
      depositAmount: true,
      customerId: true,
      receiverName: true,
      receiverPhone: true,
      deliveryAddress: true,
      preferredTimeSlot: true,
      notes: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      equipment: {
        where: { deletedAt: null },
        select: {
          quantity: true,
          equipment: { select: { model: true, sku: true } },
        },
      },
    },
  })

  if (!booking) return null

  const equipmentRows = Array.isArray((booking as any).equipment) ? ((booking as any).equipment as any[]) : []
  const equipmentCount = equipmentRows.reduce((sum, row) => {
    const qty = typeof row?.quantity === 'number' && Number.isFinite(row.quantity) ? row.quantity : 0
    return sum + Math.max(0, qty)
  }, 0)
  const equipmentSummary = equipmentRows
    .map((row) => {
      const model = typeof row?.equipment?.model === 'string' ? row.equipment.model.trim() : ''
      const sku = typeof row?.equipment?.sku === 'string' ? row.equipment.sku.trim() : ''
      const name = model || sku
      const qty = typeof row?.quantity === 'number' && Number.isFinite(row.quantity) ? row.quantity : 0
      if (!name) return null
      return qty > 1 ? `${name} × ${qty}` : name
    })
    .filter(Boolean)
    .join('، ')

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalAmount: toNumber(booking.totalAmount) ?? 0,
    vatAmount: toNumber(booking.vatAmount) ?? 0,
    depositAmount: toNumber(booking.depositAmount),
    customerId: booking.customerId,
    receiverName: booking.receiverName,
    receiverPhone: booking.receiverPhone,
    deliveryAddress: booking.deliveryAddress,
    preferredTimeSlot: booking.preferredTimeSlot,
    notes: booking.notes,
    customer: booking.customer
      ? {
          id: booking.customer.id,
          name: booking.customer.name,
          email: booking.customer.email,
          phone: booking.customer.phone,
        }
      : null,
    equipmentSummary,
    equipmentCount,
  }
}

async function loadCustomer(userId: string): Promise<LoadedCustomer | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  })

  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  }
}

async function buildTemplateData(
  eventName: string,
  trigger: string,
  payload: Record<string, unknown>
): Promise<{
  customer: LoadedCustomer | null
  booking: LoadedBooking | null
  userId?: string
  templateData: Record<string, unknown>
}> {
  let booking: LoadedBooking | null = null
  const payloadBooking = payload.booking as Record<string, unknown> | undefined
  const bookingId =
    typeof payload.bookingId === 'string'
      ? payload.bookingId
      : typeof payloadBooking?.id === 'string'
        ? payloadBooking.id
        : undefined

  if (bookingId) {
    booking = await loadBooking(bookingId)
  }

  const userId =
    booking?.customerId ||
    (typeof payload.customerId === 'string' ? payload.customerId : undefined) ||
    (typeof payload.userId === 'string' ? payload.userId : undefined)

  let customer = booking?.customer ?? null
  if (!customer && userId) {
    customer = await loadCustomer(userId)
  }

  const amount = toNumber(payload.amount)
  const totalAmount = booking?.totalAmount ?? amount ?? 0
  const vatAmount = booking?.vatAmount ?? 0
  const depositAmount = booking?.depositAmount ?? null
  const baseUrl = getAppBaseUrl()
  const resolvedBookingId = booking?.id ?? bookingId ?? ''
  const customerLabel = getCustomerLabel(customer, booking)

  return {
    customer,
    booking,
    userId,
    templateData: {
      ...payload,
      eventName,
      trigger,
      booking,
      customer,
      bookingId: resolvedBookingId,
      bookingNumber:
        booking?.bookingNumber ??
        (typeof payload.bookingNumber === 'string' ? payload.bookingNumber : ''),
      bookingStatus: booking?.status ?? (typeof payloadBooking?.status === 'string' ? payloadBooking.status : ''),
      customerId: customer?.id ?? booking?.customerId ?? userId ?? '',
      customerName: customerLabel,
      customerEmail: customer?.email ?? '',
      customerPhone: customer?.phone ?? booking?.receiverPhone ?? '',
      amount: amount ?? totalAmount,
      paymentAmount: amount ?? totalAmount,
      totalAmount,
      vatAmount,
      depositAmount,
      equipmentSummary: booking?.equipmentSummary ?? '',
      equipmentCount: booking?.equipmentCount ?? 0,
      startDate: booking?.startDate ?? payloadBooking?.startDate ?? null,
      endDate: booking?.endDate ?? payloadBooking?.endDate ?? null,
      dueDate: booking?.endDate ?? payloadBooking?.endDate ?? null,
      receiverName: booking?.receiverName ?? '',
      receiverPhone: booking?.receiverPhone ?? '',
      deliveryAddress: booking?.deliveryAddress ?? '',
      preferredTimeSlot: booking?.preferredTimeSlot ?? '',
      notes: booking?.notes ?? '',
      confirmationUrl: resolvedBookingId ? `${baseUrl}/booking/confirmation/${resolvedBookingId}` : '',
      portalBookingUrl: resolvedBookingId ? `${baseUrl}/portal/bookings/${resolvedBookingId}` : '',
      trackingUrl:
        payload.deliveryId || payload.id
          ? `${baseUrl}/booking/track/${String(payload.deliveryId || payload.id)}`
          : '',
    },
  }
}

async function renderRuleTemplate(
  templateId: string | null,
  templateData: Record<string, unknown>
): Promise<{ subject: string | null; bodyText: string; bodyHtml: string | null }> {
  if (!templateId) {
    return { subject: null, bodyText: '', bodyHtml: null }
  }

  const template = await prisma.notificationTemplate.findFirst({
    where: {
      id: templateId,
      isActive: true,
    },
    select: {
      slug: true,
      language: true,
    },
  })

  if (!template) {
    return { subject: null, bodyText: '', bodyHtml: null }
  }

  const rendered = await renderTemplate(template.slug, template.language, templateData)
  return rendered ?? { subject: null, bodyText: '', bodyHtml: null }
}

async function loadInternalRecipients(
  recipientType: RuleRecipientType,
  specificRecipients: unknown,
  trigger: string
): Promise<InternalRecipient[]> {
  if (recipientType === 'CUSTOMER') {
    return []
  }

  const specificIds = normalizeStringArray(specificRecipients)
  const where: Record<string, unknown> = {
    isActive: true,
  }

  if (specificIds.length > 0) {
    where.id = { in: specificIds }
  } else if (recipientType === 'WAREHOUSE') {
    where.role = 'WAREHOUSE_MANAGER'
  } else if (recipientType === 'BUSINESS') {
    where.role = { not: 'WAREHOUSE_MANAGER' }
  }

  const recipients = await prisma.businessRecipient.findMany({
    where: where as never,
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      alternateEmail: true,
      phone: true,
      alternatePhone: true,
      whatsappNumber: true,
      preferredChannel: true,
      receiveTriggers: true,
      excludeTriggers: true,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  return recipients.filter((recipient) => isRecipientSubscribedToTrigger(recipient, trigger))
}

async function sendCustomerNotifications(params: {
  userId?: string
  channels: RuleChannel[]
  eventName: string
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  templateId: string | null
  templateData: Record<string, unknown>
  customer: LoadedCustomer | null
}): Promise<number> {
  const { userId, channels, eventName, subject, bodyText, bodyHtml, templateId, templateData, customer } = params

  if (!userId) {
    return 0
  }

  let sentCount = 0

  for (const channel of channels) {
    if (channel === 'IN_APP') {
      await NotificationService.send({
        userId,
        channel: NotificationChannel.IN_APP,
        type: eventName,
        title: subject ?? 'Notification',
        message: bodyText,
        data: templateData,
      })
      sentCount += 1
      continue
    }

    if (channel === 'EMAIL' && customer?.email) {
      enqueueNotification({
        channel: 'email',
        recipient: customer.email,
        subject: subject ?? 'Notification',
        body: bodyHtml ?? bodyText,
        templateId: templateId ?? undefined,
        recipientUserId: userId,
      })
      sentCount += 1
      continue
    }

    if (channel === 'WHATSAPP' && customer?.phone) {
      enqueueNotification({
        channel: 'whatsapp',
        recipient: customer.phone,
        body: bodyText,
        templateId: templateId ?? undefined,
        recipientUserId: userId,
      })
      sentCount += 1
      continue
    }

    if (channel === 'SMS' && customer?.phone) {
      enqueueNotification({
        channel: 'sms',
        recipient: customer.phone,
        body: bodyText,
        templateId: templateId ?? undefined,
        recipientUserId: userId,
      })
      sentCount += 1
    }
  }

  return sentCount
}

async function sendInternalNotifications(params: {
  recipients: InternalRecipient[]
  channels: RuleChannel[]
  trigger: string
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  templateId: string | null
}): Promise<number> {
  const { recipients, channels, trigger, subject, bodyText, bodyHtml, templateId } = params
  let sentCount = 0

  for (const recipient of recipients) {
    const recipientChannels = resolveRecipientChannels(recipient, channels)

    for (const channel of recipientChannels) {
      if (channel === 'IN_APP') {
        continue
      }

      if (channel === 'EMAIL') {
        const email = getInternalEmail(recipient)
        if (!email) continue

        enqueueNotification({
          channel: 'email',
          recipient: email,
          subject: subject ?? `[${trigger}] Notification`,
          body: bodyHtml ?? bodyText,
          templateId: templateId ?? undefined,
        })
        sentCount += 1
        continue
      }

      if (channel === 'WHATSAPP' || channel === 'SMS') {
        const phone = getInternalPhone(recipient, channel)
        if (!phone) continue

        enqueueNotification({
          channel: channel === 'WHATSAPP' ? 'whatsapp' : 'sms',
          recipient: phone,
          body: bodyText,
          templateId: templateId ?? undefined,
        })
        sentCount += 1
      }
    }
  }

  return sentCount
}

export async function hasActiveAutomationRulesForTrigger(trigger: string): Promise<boolean> {
  const count = await prisma.automationRule.count({
    where: {
      trigger: trigger as never,
      isActive: true,
    },
  })

  return count > 0
}

/**
 * Process an event: find matching automation rules and send notifications.
 */
export async function processEventForMessaging(
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const trigger = EVENT_TO_TRIGGER[eventName]
  if (!trigger) return

  if (
    (eventName === 'payment.failed' || eventName === 'payment.refunded') &&
    payload.notifyCustomer === false
  ) {
    return
  }

  if (eventName === 'booking.created') {
    const status = (payload.booking as { status?: string } | undefined)?.status
    if (status === 'DRAFT' || status === 'RISK_CHECK' || status === 'PAYMENT_PENDING') {
      return
    }
  }

  const context = await buildTemplateData(eventName, trigger, payload)
  const userId = context.userId
  let templateData = context.templateData

  if (userId && eventName !== 'user.whale_sign_in') {
    const totalSpent = await prisma.booking.aggregate({
      where: { customerId: userId, status: 'CLOSED' },
      _sum: { totalAmount: true },
    })
    const spent = Number(totalSpent._sum.totalAmount || 0)
    if (spent > 5000) {
      templateData = { ...templateData, isWhale: true, totalSpent: spent }
    }
  }

  if (eventName === 'user.whale_sign_in' && userId) {
    const totalSpent = await prisma.booking.aggregate({
      where: { customerId: userId, status: 'CLOSED' },
      _sum: { totalAmount: true },
    })
    const spent = Number(totalSpent._sum.totalAmount || 0)
    if (spent < 5000) return
    templateData = { ...templateData, isWhale: true, totalSpent: spent }
  }

  const rules = await prisma.automationRule.findMany({
    where: { trigger: trigger as never, isActive: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })

  for (const rule of rules) {
    const triggeredAt = new Date()

    try {
      const channels = ((rule.channels as string[]) ?? []).filter(
        (channel): channel is RuleChannel =>
          channel === 'EMAIL' ||
          channel === 'SMS' ||
          channel === 'WHATSAPP' ||
          channel === 'IN_APP'
      )

      if (channels.length === 0) {
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastTriggered: triggeredAt },
        })
        continue
      }

      const rendered = await renderRuleTemplate(rule.templateId, templateData)
      let subject = rendered.subject
      let bodyText = rendered.bodyText
      let bodyHtml = rendered.bodyHtml

      if (!bodyText && !subject) {
        const fallback = getFallbackMessage(eventName, templateData)
        subject = fallback.title
        bodyText = fallback.message
        bodyHtml = null
      }

      let sentCount = 0
      const recipientType = rule.recipientType as RuleRecipientType

      if (recipientType === 'CUSTOMER' || recipientType === 'ALL') {
        sentCount += await sendCustomerNotifications({
          userId,
          channels,
          eventName,
          subject,
          bodyText,
          bodyHtml,
          templateId: rule.templateId,
          templateData,
          customer: context.customer,
        })
      }

      if (recipientType !== 'CUSTOMER') {
        const recipients = await loadInternalRecipients(
          recipientType,
          rule.specificRecipients,
          trigger
        )

        sentCount += await sendInternalNotifications({
          recipients,
          channels,
          trigger,
          subject,
          bodyText,
          bodyHtml,
          templateId: rule.templateId,
        })
      }

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          lastTriggered: triggeredAt,
          sentCount: { increment: sentCount },
        },
      })
    } catch (error) {
      await prisma.automationRule
        .update({
          where: { id: rule.id },
          data: {
            lastTriggered: triggeredAt,
            failedCount: { increment: 1 },
          },
        })
        .catch(() => undefined)

      console.error('Failed to process automation rule:', {
        ruleId: rule.id,
        eventName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (eventName === 'user.referral_signup') {
    const referralUserId = typeof payload.userId === 'string' ? payload.userId : undefined
    const referralCode = typeof payload.referralCode === 'string' ? payload.referralCode : undefined

    if (referralUserId && referralCode) {
      try {
        const refereeCoupon = await CouponService.generateReferralCoupon(referralUserId, 'WELCOME')
        await NotificationService.sendMultiChannel(
          {
            userId: referralUserId,
            type: 'REFERRAL_REWARD_REFEREE',
            title: 'هدية ترحيبية 🎁',
            message: `أهلاً بك في فليكس كام! استخدم الكود ${refereeCoupon} للحصول على خصم 50 ريال على حجزك الأول.`,
            data: { couponCode: refereeCoupon },
          },
          [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        )

        const referral = await (prisma as any).referral.findFirst({
          where: { code: referralCode, deletedAt: null },
        })

        if (referral?.influencerId) {
          const referrerCoupon = await CouponService.generateReferralCoupon(
            referral.influencerId,
            'REFERRAL-GIFT'
          )

          await NotificationService.sendMultiChannel(
            {
              userId: referral.influencerId,
              type: 'REFERRAL_REWARD_REFERRER',
              title: 'صديقك انضم إلينا! 🎊',
              message: `شكراً لدعوتك! حصلت على كود خصم 50 ريال: ${referrerCoupon}`,
              data: { couponCode: referrerCoupon },
            },
            [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
          )
        }
      } catch (error) {
        console.error('Failed to process referral rewards:', error)
      }
    }
  }

  if (eventName === 'review.submitted' && userId) {
    try {
      const reviewCoupon = await CouponService.generateReferralCoupon(userId, 'REVIEW-GIFT')
      await NotificationService.sendMultiChannel(
        {
          userId,
          type: 'REVIEW_REWARD',
          title: 'شكراً لتقييمك! 🌟',
          message: `شكراً لمشاركتنا رأيك! حصلت على كود خصم 50 ريال لطلبك القادم: ${reviewCoupon}`,
          data: { couponCode: reviewCoupon },
        },
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
      )
    } catch (error) {
      console.error('Failed to process review reward:', error)
    }
  }
}

function getFallbackMessage(
  eventName: string,
  payload: Record<string, unknown>
): { title: string; message: string } {
  const num =
    (typeof payload.bookingNumber === 'string' ? payload.bookingNumber : '') ||
    (payload.booking &&
    typeof payload.booking === 'object' &&
    'bookingNumber' in payload.booking &&
    typeof payload.booking.bookingNumber === 'string'
      ? payload.booking.bookingNumber
      : '')

  switch (eventName) {
    case 'booking.created':
      return {
        title: 'تم استلام طلبك',
        message: `تم استلام طلبك رقم ${num}. سنتواصل معك قريباً.`,
      }
    case 'booking.confirmed':
      return { title: 'تم تأكيد الحجز', message: `تم تأكيد حجزك رقم ${num}.` }
    case 'booking.cancelled':
      return { title: 'تم إلغاء الحجز', message: `تم إلغاء حجزك رقم ${num}.` }
    case 'payment.success':
      return {
        title: 'تم استلام الدفع',
        message: `تم استلام دفعتك بنجاح لطلب ${num || 'الحجز'} .`,
      }
    case 'payment.failed':
      return { title: 'فشل الدفع', message: 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.' }
    case 'review.request':
      return {
        title: 'نقدر رأيك',
        message: `كيف كانت تجربتك في حجز رقم ${num}؟ يسعدنا تقييمك للمعدات.`,
      }
    case 'user.whale_sign_in': {
      const spent = payload.totalSpent ? `${payload.totalSpent} SAR` : ''
      return {
        title: 'VIP Sign-In!',
        message: `Customer ${payload.userId} (VIP) has signed in. Total spend: ${spent}`,
      }
    }
    default:
      return { title: 'إشعار', message: 'لديك إشعار جديد.' }
  }
}
