import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient, NotificationChannel } from '@prisma/client'
import { deliverOtpCode } from '@/lib/services/otp-delivery.service'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  const txt = readFileSync(p, 'utf8')
  for (const line of txt.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const prisma = new PrismaClient()
const testPhone = process.argv[2] || '+966582433739'

async function main() {
  loadEnv()
  process.env.NODE_ENV = process.env.NODE_ENV || 'production'

  await prisma.messagingChannelConfig
    .upsert({
      where: { channel: NotificationChannel.WHATSAPP },
      update: {
        isEnabled: true,
        businessPhone:
          process.env.TWILIO_WHATSAPP_PHONE_NUMBER?.trim() || 'whatsapp:+14155238886',
      },
      create: {
        channel: NotificationChannel.WHATSAPP,
        isEnabled: true,
        businessPhone:
          process.env.TWILIO_WHATSAPP_PHONE_NUMBER?.trim() || 'whatsapp:+14155238886',
      },
    })
    .catch(() => {})

  console.log('ENABLE_SMS=', process.env.ENABLE_SMS)
  console.log('ENABLE_WHATSAPP=', process.env.ENABLE_WHATSAPP)
  console.log('OTP_TRY_WHATSAPP_FIRST=', process.env.OTP_TRY_WHATSAPP_FIRST || '(unset)')
  console.log('TWILIO_PHONE_NUMBER set=', !!process.env.TWILIO_PHONE_NUMBER)
  console.log('TWILIO_SMS_PHONE_NUMBER=', process.env.TWILIO_SMS_PHONE_NUMBER || '(unset)')
  console.log('TWILIO_WHATSAPP_PHONE_NUMBER=', process.env.TWILIO_WHATSAPP_PHONE_NUMBER || '(unset)')
  console.log('Sending diag OTP to', testPhone)

  const result = await deliverOtpCode({
    phone: testPhone,
    code: '123456',
    logContext: '[diag-otp]',
  })

  console.log('Result:', JSON.stringify(result, null, 2))
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
