/**
 * One-off test: send SMS + WhatsApp to verify Twilio staff alert paths.
 * Run: npx tsx scripts/test-alerts-sms-whatsapp.ts
 * Requires: .env with Twilio creds, TWILIO_SMS/TWILIO_PHONE for SMS, WA sender in env or set below.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient, NotificationChannel } from '@prisma/client'
import { SmsService } from '@/lib/services/sms.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'

function loadEnvFile() {
  const p = resolve(process.cwd(), '.env')
  const txt = readFileSync(p, 'utf8')
  for (const line of txt.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const TEST_PHONE = '+966582433739'
const prisma = new PrismaClient()

async function main() {
  loadEnvFile()
  process.env.ENABLE_SMS = process.env.ENABLE_SMS ?? 'true'
  process.env.ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP ?? 'true'

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env')
  }

  // WhatsApp sandbox sender (join sandbox from TEST_PHONE first if testing sandbox).
  await prisma.messagingChannelConfig.upsert({
    where: { channel: NotificationChannel.WHATSAPP },
    update: {
      isEnabled: true,
      businessPhone: process.env.TWILIO_WHATSAPP_PHONE_NUMBER?.trim() || 'whatsapp:+14155238886',
    },
    create: {
      channel: NotificationChannel.WHATSAPP,
      isEnabled: true,
      businessPhone: process.env.TWILIO_WHATSAPP_PHONE_NUMBER?.trim() || 'whatsapp:+14155238886',
    },
  })

  const stamp = new Date().toISOString()
  const smsBody = `[FlixCam test SMS] ${stamp} — تنبيه تجريبي للـ SMS`
  const waBody = `[FlixCam test WhatsApp] ${stamp}\nتنبيه تجريبي للواتساب — Staff alert path`

  console.log('--- SMS ---')
  console.log('isSmsConfigured:', SmsService.isSmsConfigured())
  const smsResult = await SmsService.sendSmsText(TEST_PHONE, smsBody, { logToMessageLog: true })
  console.log('SMS result:', smsResult)

  console.log('\n--- WhatsApp ---')
  console.log('isWhatsAppConfigured:', WhatsAppService.isWhatsAppConfigured())
  const waResult = await WhatsAppService.sendWhatsAppText(TEST_PHONE, waBody, {
    logToMessageLog: true,
  })
  console.log('WhatsApp result:', waResult)

  await prisma.$disconnect()

  if (!smsResult.ok && !waResult.ok) {
    console.error('\nBoth failed — check Twilio logs / sandbox join / FROM numbers.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
