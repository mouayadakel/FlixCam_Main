import { Prisma, PrismaClient } from '@prisma/client'

type SeedUser = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  userRoles: Array<{ role: { name: string } }>
}

type SeedResult = {
  templates: number
  rules: number
  recipients: number
  channelConfigs: number
}

const PAYMENT_RECEIVED_VARIABLES = [
  'customerName',
  'bookingNumber',
  'amount',
  'paymentAmount',
  'totalAmount',
  'startDate',
  'endDate',
  'confirmationUrl',
  'receiverName',
  'receiverPhone',
  'deliveryAddress',
  'notes',
] satisfies string[]

function stripEmptyValues<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, current]) => {
    if (current == null) return false
    if (typeof current === 'string') return current.trim().length > 0
    if (Array.isArray(current)) return current.length > 0
    return true
  })

  return Object.fromEntries(entries) as T
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function hasRole(user: SeedUser, roleName: string): boolean {
  return (
    user.role === roleName ||
    user.userRoles.some(
      (assignment) => assignment.role.name.toLowerCase() === roleName.toLowerCase()
    )
  )
}

function isInternalFlixcamEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith('@flixcam.rent'))
}

async function loadUsers(prisma: PrismaClient): Promise<SeedUser[]> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

function pickOwner(users: SeedUser[]): SeedUser | null {
  const adminLike = users.filter((user) => hasRole(user, 'ADMIN') || hasRole(user, 'SUPER_ADMIN'))
  return adminLike.find((user) => !isInternalFlixcamEmail(user.email)) ?? adminLike[0] ?? null
}

function pickAdmin(users: SeedUser[], owner: SeedUser | null): SeedUser | null {
  const adminLike = users.filter((user) => hasRole(user, 'ADMIN') || hasRole(user, 'SUPER_ADMIN'))
  return adminLike.find((user) => user.id !== owner?.id) ?? adminLike[0] ?? null
}

function pickWarehouse(users: SeedUser[]): SeedUser | null {
  return (
    users.find((user) => hasRole(user, 'WAREHOUSE_MANAGER')) ??
    users.find((user) => hasRole(user, 'CUSTOMER_SERVICE')) ??
    users.find((user) => user.email.toLowerCase() === 'support@flixcam.rent') ??
    null
  )
}

async function upsertTemplate(
  prisma: PrismaClient,
  input: {
    name: string
    slug: string
    description: string
    channel: 'EMAIL' | 'WHATSAPP'
    subject: string | null
    bodyText: string
    bodyHtml?: string | null
    variant: string
  }
) {
  return prisma.notificationTemplate.upsert({
    where: {
      slug_language: {
        slug: input.slug,
        language: 'ar',
      },
    },
    update: {
      name: input.name,
      description: input.description,
      trigger: 'PAYMENT_RECEIVED',
      channel: input.channel,
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      variables: toJson(PAYMENT_RECEIVED_VARIABLES),
      isActive: true,
      variant: input.variant,
    },
    create: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      trigger: 'PAYMENT_RECEIVED',
      channel: input.channel,
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      variables: toJson(PAYMENT_RECEIVED_VARIABLES),
      isActive: true,
      language: 'ar',
      variant: input.variant,
    },
  })
}

async function upsertRecipient(
  prisma: PrismaClient,
  input: {
    key: string
    name: string
    role:
      | 'OWNER'
      | 'WAREHOUSE_MANAGER'
      | 'SUPPORT'
      | 'CO_OWNER'
      | 'GENERAL_MANAGER'
      | 'OPERATIONS_MANAGER'
      | 'INVENTORY_MANAGER'
      | 'CUSTOMER_SUPPORT'
      | 'TECHNICAL_SUPPORT'
      | 'ACCOUNTANT'
      | 'SALES_MANAGER'
      | 'MARKETING_MANAGER'
      | 'LEGAL'
      | 'IT_ADMIN'
      | 'CUSTOM'
    email?: string | null
    phone?: string | null
    whatsappNumber?: string | null
    preferredChannel?: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'IN_APP' | null
    createdBy?: string
  }
) {
  const existing = await prisma.businessRecipient.findFirst({
    where: {
      jobTitle: input.key,
    },
  })

  const data = {
    name: input.name,
    role: input.role,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    whatsappNumber: input.whatsappNumber?.trim() || null,
    preferredChannel: input.preferredChannel ?? null,
    preferredLanguage: 'ar',
    timezone: 'Asia/Riyadh',
    receiveTriggers: toJson(['PAYMENT_RECEIVED']),
    excludeTriggers: toJson([]),
    isActive: true,
    isPrimary: true,
    priority: input.role === 'OWNER' ? 10 : input.role === 'WAREHOUSE_MANAGER' ? 8 : 7,
    department: 'Messaging',
    jobTitle: input.key,
    createdBy: input.createdBy ?? undefined,
  }

  if (existing) {
    return prisma.businessRecipient.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.businessRecipient.create({
    data,
  })
}

async function upsertRule(
  prisma: PrismaClient,
  input: {
    name: string
    description: string
    channels: ('EMAIL' | 'WHATSAPP')[]
    templateId: string
    recipientType: 'CUSTOMER' | 'BUSINESS' | 'WAREHOUSE' | 'ALL'
    specificRecipients?: string[] | null
    priority: number
    createdBy?: string
  }
) {
  const existing = await prisma.automationRule.findFirst({
    where: {
      name: input.name,
    },
  })

  const data = {
    name: input.name,
    description: input.description,
    trigger: 'PAYMENT_RECEIVED' as const,
    channels: toJson(input.channels),
    templateId: input.templateId,
    isActive: true,
    conditions: toJson({}),
    delayMinutes: 0,
    triggerDelay: 0,
    sendWindow: null,
    recipientType: input.recipientType,
    specificRecipients:
      input.specificRecipients && input.specificRecipients.length > 0
        ? toJson(input.specificRecipients)
        : Prisma.DbNull,
    maxRetries: 3,
    retryDelay: 5,
    allowDuplicates: false,
    frequencyCap: Prisma.DbNull,
    timezone: 'Asia/Riyadh',
    respectDND: true,
    priority: input.priority,
    createdBy: input.createdBy ?? undefined,
  }

  if (existing) {
    return prisma.automationRule.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.automationRule.create({
    data,
  })
}

async function upsertChannelConfigs(prisma: PrismaClient): Promise<number> {
  const emailConfig = stripEmptyValues({
    fromAddress: process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? 'no-reply@flixcam.rent',
    fromName: process.env.RESEND_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'FlixCam.rent',
    replyTo: 'support@flixcam.rent',
  })
  const whatsappConfig = stripEmptyValues({
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  })
  const businessPhone =
    process.env.NEXT_PUBLIC_BUSINESS_PHONE ??
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    process.env.TWILIO_PHONE_NUMBER ??
    null

  await prisma.messagingChannelConfig.upsert({
    where: { channel: 'EMAIL' },
    update: {
      isEnabled: true,
      config: toJson(emailConfig),
    },
    create: {
      channel: 'EMAIL',
      isEnabled: true,
      config: toJson(emailConfig),
    },
  })

  await prisma.messagingChannelConfig.upsert({
    where: { channel: 'WHATSAPP' },
    update: {
      isEnabled: true,
      businessPhone,
      config: toJson(whatsappConfig),
    },
    create: {
      channel: 'WHATSAPP',
      isEnabled: true,
      businessPhone,
      config: toJson(whatsappConfig),
    },
  })

  return 2
}

export async function seedPaymentReceivedMessaging(
  prisma: PrismaClient,
  options?: { createdBy?: string }
): Promise<SeedResult> {
  const users = await loadUsers(prisma)
  const ownerCandidate = pickOwner(users)
  const adminCandidate = pickAdmin(users, ownerCandidate)
  const warehouseCandidate = pickWarehouse(users)

  const fallbackBusinessPhone =
    process.env.NEXT_PUBLIC_BUSINESS_PHONE ??
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    process.env.TWILIO_PHONE_NUMBER ??
    adminCandidate?.phone ??
    ownerCandidate?.phone ??
    null

  const fallbackWarehouseEmail = warehouseCandidate?.email ?? 'support@flixcam.rent'

  const ownerRecipient = await upsertRecipient(prisma, {
    key: 'SYSTEM_PAYMENT_RECEIVED_OWNER',
    name: ownerCandidate?.name?.trim() || 'Owner',
    role: 'OWNER',
    email: ownerCandidate?.email ?? adminCandidate?.email ?? null,
    phone: ownerCandidate?.phone ?? adminCandidate?.phone ?? fallbackBusinessPhone,
    whatsappNumber: ownerCandidate?.phone ?? adminCandidate?.phone ?? fallbackBusinessPhone,
    createdBy: options?.createdBy,
  })

  const adminRecipient = await upsertRecipient(prisma, {
    key: 'SYSTEM_PAYMENT_RECEIVED_ADMIN',
    name: adminCandidate?.name?.trim() || 'Admin',
    role: 'CUSTOM',
    email: adminCandidate?.email ?? ownerCandidate?.email ?? 'admin@flixcam.rent',
    phone: adminCandidate?.phone ?? fallbackBusinessPhone,
    whatsappNumber: adminCandidate?.phone ?? fallbackBusinessPhone,
    createdBy: options?.createdBy,
  })

  const warehouseRecipient = await upsertRecipient(prisma, {
    key: 'SYSTEM_PAYMENT_RECEIVED_WAREHOUSE',
    name: warehouseCandidate?.name?.trim() || 'Warehouse Manager',
    role: 'WAREHOUSE_MANAGER',
    email: fallbackWarehouseEmail,
    phone: warehouseCandidate?.phone ?? fallbackBusinessPhone,
    whatsappNumber: warehouseCandidate?.phone ?? fallbackBusinessPhone,
    createdBy: options?.createdBy,
  })

  const customerEmailTemplate = await upsertTemplate(prisma, {
    name: 'Payment Received - Customer Email',
    slug: 'payment-received-customer-email',
    description: 'Customer confirmation email sent when payment is completed.',
    channel: 'EMAIL',
    subject: 'تم تأكيد طلبك {{bookingNumber}} | FlixCam.rent',
    bodyText:
      'مرحباً {{customerName}},\n\n' +
      'تم استلام دفعتك وتأكيد طلبك رقم {{bookingNumber}}.\n' +
      'المبلغ المدفوع: {{formatCurrency amount}}\n' +
      '{{#if startDate}}موعد البداية: {{formatDate startDate}}\n{{/if}}' +
      '{{#if endDate}}موعد النهاية: {{formatDate endDate}}\n{{/if}}' +
      '{{#if confirmationUrl}}\nرابط التأكيد:\n{{confirmationUrl}}\n{{/if}}\n' +
      'شكراً لاختيارك FlixCam.rent.',
    bodyHtml:
      '<p>مرحباً {{customerName}},</p>' +
      '<p>تم استلام دفعتك وتأكيد طلبك رقم <strong>{{bookingNumber}}</strong>.</p>' +
      '<p><strong>المبلغ المدفوع:</strong> {{formatCurrency amount}}</p>' +
      '{{#if startDate}}<p><strong>موعد البداية:</strong> {{formatDate startDate}}</p>{{/if}}' +
      '{{#if endDate}}<p><strong>موعد النهاية:</strong> {{formatDate endDate}}</p>{{/if}}' +
      '{{#if confirmationUrl}}<p><a href="{{confirmationUrl}}">عرض تأكيد الطلب</a></p>{{/if}}' +
      '<p>شكراً لاختيارك FlixCam.rent.</p>',
    variant: 'customer',
  })

  const customerWhatsappTemplate = await upsertTemplate(prisma, {
    name: 'Payment Received - Customer WhatsApp',
    slug: 'payment-received-customer-whatsapp',
    description: 'Customer WhatsApp confirmation sent when payment is completed.',
    channel: 'WHATSAPP',
    subject: null,
    bodyText:
      'مرحباً {{customerName}}،\n' +
      'تم استلام دفعتك وتأكيد طلبك {{bookingNumber}}.\n' +
      'المبلغ: {{formatCurrency amount}}\n' +
      '{{#if confirmationUrl}}التأكيد: {{confirmationUrl}}{{/if}}',
    variant: 'customer',
  })

  const internalEmailTemplate = await upsertTemplate(prisma, {
    name: 'Payment Received - Internal Email',
    slug: 'payment-received-internal-email',
    description: 'Internal email sent to owner, admin, and warehouse when payment is completed.',
    channel: 'EMAIL',
    subject: 'تم استلام الدفع للطلب {{bookingNumber}}',
    bodyText:
      'تم تأكيد الدفع للطلب {{bookingNumber}}.\n\n' +
      'العميل: {{customerName}}\n' +
      'المبلغ: {{formatCurrency amount}}\n' +
      '{{#if startDate}}البداية: {{formatDate startDate}}\n{{/if}}' +
      '{{#if endDate}}النهاية: {{formatDate endDate}}\n{{/if}}' +
      '{{#if receiverName}}اسم المستلم: {{receiverName}}\n{{/if}}' +
      '{{#if receiverPhone}}هاتف المستلم: {{receiverPhone}}\n{{/if}}' +
      '{{#if deliveryAddress}}العنوان: {{deliveryAddress}}\n{{/if}}' +
      '{{#if notes}}ملاحظات: {{notes}}\n{{/if}}' +
      '{{#if confirmationUrl}}\nرابط التأكيد: {{confirmationUrl}}{{/if}}',
    bodyHtml:
      '<p>تم تأكيد الدفع للطلب <strong>{{bookingNumber}}</strong>.</p>' +
      '<p><strong>العميل:</strong> {{customerName}}</p>' +
      '<p><strong>المبلغ:</strong> {{formatCurrency amount}}</p>' +
      '{{#if startDate}}<p><strong>البداية:</strong> {{formatDate startDate}}</p>{{/if}}' +
      '{{#if endDate}}<p><strong>النهاية:</strong> {{formatDate endDate}}</p>{{/if}}' +
      '{{#if receiverName}}<p><strong>اسم المستلم:</strong> {{receiverName}}</p>{{/if}}' +
      '{{#if receiverPhone}}<p><strong>هاتف المستلم:</strong> {{receiverPhone}}</p>{{/if}}' +
      '{{#if deliveryAddress}}<p><strong>العنوان:</strong> {{deliveryAddress}}</p>{{/if}}' +
      '{{#if notes}}<p><strong>ملاحظات:</strong> {{notes}}</p>{{/if}}' +
      '{{#if confirmationUrl}}<p><a href="{{confirmationUrl}}">عرض تأكيد الطلب</a></p>{{/if}}',
    variant: 'internal',
  })

  const internalWhatsappTemplate = await upsertTemplate(prisma, {
    name: 'Payment Received - Internal WhatsApp',
    slug: 'payment-received-internal-whatsapp',
    description:
      'Internal WhatsApp alert sent to owner, admin, and warehouse when payment is completed.',
    channel: 'WHATSAPP',
    subject: null,
    bodyText:
      'تم استلام الدفع للطلب {{bookingNumber}}.\n' +
      'العميل: {{customerName}}\n' +
      'المبلغ: {{formatCurrency amount}}\n' +
      '{{#if receiverPhone}}هاتف المستلم: {{receiverPhone}}\n{{/if}}' +
      '{{#if confirmationUrl}}التأكيد: {{confirmationUrl}}{{/if}}',
    variant: 'internal',
  })

  const internalRecipientIds = [ownerRecipient.id, adminRecipient.id, warehouseRecipient.id]

  await upsertRule(prisma, {
    name: 'Payment Received - Customer Email Rule',
    description: 'Send customer confirmation email when payment is completed.',
    channels: ['EMAIL'],
    templateId: customerEmailTemplate.id,
    recipientType: 'CUSTOMER',
    priority: 100,
    createdBy: options?.createdBy,
  })

  await upsertRule(prisma, {
    name: 'Payment Received - Customer WhatsApp Rule',
    description: 'Send customer WhatsApp confirmation when payment is completed.',
    channels: ['WHATSAPP'],
    templateId: customerWhatsappTemplate.id,
    recipientType: 'CUSTOMER',
    priority: 95,
    createdBy: options?.createdBy,
  })

  await upsertRule(prisma, {
    name: 'Payment Received - Internal Email Rule',
    description: 'Send internal email confirmation to owner, admin, and warehouse after payment.',
    channels: ['EMAIL'],
    templateId: internalEmailTemplate.id,
    recipientType: 'BUSINESS',
    specificRecipients: internalRecipientIds,
    priority: 90,
    createdBy: options?.createdBy,
  })

  await upsertRule(prisma, {
    name: 'Payment Received - Internal WhatsApp Rule',
    description:
      'Send internal WhatsApp confirmation to owner, admin, and warehouse after payment.',
    channels: ['WHATSAPP'],
    templateId: internalWhatsappTemplate.id,
    recipientType: 'BUSINESS',
    specificRecipients: internalRecipientIds,
    priority: 85,
    createdBy: options?.createdBy,
  })

  const channelConfigs = await upsertChannelConfigs(prisma)

  return {
    templates: 4,
    rules: 4,
    recipients: 3,
    channelConfigs,
  }
}
