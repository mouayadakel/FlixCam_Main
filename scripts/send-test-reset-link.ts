/**
 * Send a test password reset OTP to a phone number (WhatsApp, same as sign-in OTP).
 * Usage: npx tsx scripts/send-test-reset-link.ts 0582433739
 */

import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'
import { deliverOtpCode } from '../src/lib/services/otp-delivery.service'
import { cacheSet } from '../src/lib/cache'

const phone = process.argv[2] || '0582433739'
const OTP_LENGTH = 6

function generateOtp(): string {
  const digits = Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10))
  return digits.join('')
}

async function main() {
  const normalized = phone.replace(/\D/g, '')
  const phoneE164 =
    normalized.length === 9 && normalized.startsWith('5')
      ? `966${normalized}`
      : normalized.length === 10 && normalized.startsWith('05')
        ? `966${normalized.slice(1)}`
        : normalized.startsWith('966')
          ? normalized
          : `966${normalized}`

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phone: phoneE164 }, { phone: `+${phoneE164}` }],
      deletedAt: null,
    },
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!user) {
    console.error('No user found with phone:', phone, '(normalized:', phoneE164, ')')
    process.exit(1)
  }

  console.log('User found:', user.name, user.email, user.phone)

  const code = generateOtp()
  await cacheSet('otp', `password_reset:${phoneE164}`, { code, at: new Date().toISOString() })

  console.log('\nOTP (dev):', code)
  console.log('\nAttempting delivery to', phoneE164, 'via WhatsApp...')

  const delivery = await deliverOtpCode({
    phone: phoneE164,
    code,
    logContext: '[TEST-RESET]',
    whatsappOnly: true,
  })

  console.log('\nDelivery result:', {
    ok: delivery.ok,
    channel: delivery.channel,
    error: delivery.error,
    userMessage: delivery.userMessage,
  })

  if (!delivery.ok) {
    console.error(
      '\nDelivery failed. Check Twilio Console and .env (ENABLE_WHATSAPP, TWILIO_*).'
    )
    process.exit(1)
  }

  console.log('\nDone. Check WhatsApp on', phone)
  console.log('Then verify at: /reset-password (enter OTP in forgot-password flow)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
