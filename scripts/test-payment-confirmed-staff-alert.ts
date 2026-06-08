import { PrismaClient } from '@prisma/client'
import { OrderNotificationService } from '@/lib/services/order-notification.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { EmailService } from '@/lib/services/email.service'
import { NotificationChannel } from '@prisma/client'

const prisma = new PrismaClient()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing env var: ${name}`)
  }
  return value.trim()
}

async function resolveBookingId(input?: string): Promise<string> {
  if (input && input.trim()) return input.trim()

  const latest = await prisma.booking.findFirst({
    where: { deletedAt: null, status: 'CONFIRMED' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })
  if (!latest) {
    throw new Error('No CONFIRMED booking found. Pass a bookingId: tsx scripts/test-payment-confirmed-staff-alert.ts <bookingId>')
  }
  return latest.id
}

async function main() {
  const email = 'Mouayadakel@gmail.com'
  const phone = '+966582433739'
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const bookingArg = args.find((value) => value && !value.startsWith('-'))

  // Ensure Twilio WhatsApp is configured before attempting a send.
  requireEnv('TWILIO_ACCOUNT_SID')
  requireEnv('TWILIO_AUTH_TOKEN')
  // WhatsApp sender should be configured via MessagingChannelConfig or TWILIO_WHATSAPP_PHONE_NUMBER.
  // We still require a legacy fallback to exist for some environments.
  requireEnv('TWILIO_PHONE_NUMBER')
  process.env.ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP || 'true'

  // Ensure email override includes the test address (optional, but useful)
  process.env.ORDER_COMPLETED_NOTIFY_EMAILS = [
    process.env.ORDER_COMPLETED_NOTIFY_EMAILS,
    email,
  ]
    .filter(Boolean)
    .join(',')

  // Ensure recipient exists in business recipients (covers both WhatsApp + email recipients).
  const existingRecipient = await prisma.businessRecipient.findFirst({
    where: { email },
    select: { id: true },
  })
  if (existingRecipient) {
    await prisma.businessRecipient.update({
      where: { id: existingRecipient.id },
      data: {
        name: 'Mouayad (Test)',
        role: 'OPERATIONS_MANAGER',
        phone,
        whatsappNumber: phone,
        isActive: true,
      },
    })
  } else {
    await prisma.businessRecipient.create({
      data: {
        name: 'Mouayad (Test)',
        role: 'OPERATIONS_MANAGER',
        email,
        phone,
        whatsappNumber: phone,
        isActive: true,
      },
    })
  }

  const bookingId = await resolveBookingId(bookingArg)
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: { id: true, bookingNumber: true, totalAmount: true, vatAmount: true, status: true },
  })
  if (!booking) throw new Error(`Booking not found: ${bookingId}`)

  if (force) {
    await prisma.event.deleteMany({
      where: {
        eventName: 'notification.payment_success.staff',
        resourceType: 'booking',
        resourceId: booking.id,
      },
    })
    console.log('Force enabled: cleared existing staff-notification event for booking', booking.id)
  }

  const amount = Number(booking.totalAmount || 0) + Number(booking.vatAmount || 0)
  console.log('Triggering staff payment-confirmed alert for booking:', {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    amount,
  })

  // Force WhatsApp sender to Twilio Sandbox sender for testing (prevents To=From issues).
  await prisma.messagingChannelConfig.upsert({
    where: { channel: NotificationChannel.WHATSAPP },
    update: { isEnabled: true, businessPhone: 'whatsapp:+14155238886' },
    create: { channel: NotificationChannel.WHATSAPP, isEnabled: true, businessPhone: 'whatsapp:+14155238886' },
  })

  // Send ONLY to requested test targets (no other staff).
  const body = [
    '🟩 اختبار تنبيه إتمام الدفع',
    `رقم الطلب: ${booking.bookingNumber}`,
    `المبلغ: ${amount} ر.س.`,
    `الحالة: ${booking.status}`,
  ].join('\n')

  const wa = await WhatsAppService.sendWhatsAppText(phone, body, { logToMessageLog: true })
  console.log('WhatsApp result:', wa)

  const emailResult = await EmailService.send({
    to: email,
    subject: `اختبار تنبيه إتمام الدفع ${booking.bookingNumber}`,
    html: `<p dir="rtl">اختبار تنبيه إتمام الدفع</p><p><strong>رقم الطلب:</strong> ${booking.bookingNumber}</p><p><strong>المبلغ:</strong> ${amount} ر.س.</p>`,
    logToMessageLog: true,
  })
  console.log('Email result:', emailResult)

  // Also trigger the real staff flow (optional) after test-only send:
  // await OrderNotificationService.notifyStaffPaymentConfirmed(booking.id, amount)

  console.log('✅ Done. Check Twilio logs + WhatsApp messages.')
}

main()
  .catch((error) => {
    console.error('❌ Test failed')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

