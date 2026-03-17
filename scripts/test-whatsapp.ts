import { WhatsAppService } from '../src/lib/services/whatsapp.service'

async function main() {
  const to = process.argv[2]
  
  if (!to) {
    console.error('❌ Please provide a destination phone number.')
    console.error('Usage: npx tsx scripts/test-whatsapp.ts +9665XXXXXXXX')
    process.exit(1)
  }

  console.log(`Testing WhatsApp sending to: ${to}...`)

  // We set logToMessageLog to false here so we don't spam your production database logs
  const result = await WhatsAppService.sendWhatsAppText(
    to, 
    'Hello from FlixCam.rent! This is a test message via Twilio WhatsApp API.', 
    { logToMessageLog: false }
  )
  
  if (result.ok) {
    console.log(`✅ Success! Message ID: ${result.messageId}`)
    console.log('Expect to receive a WhatsApp message shortly.')
  } else {
    console.error(`❌ Failed to send: ${result.error}`)
  }
}

main().catch(console.error)
