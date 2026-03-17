import Twilio from 'twilio'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = Twilio(accountSid, authToken)

async function checkMessage(messageSid: string) {
  try {
    const msg = await client.messages(messageSid).fetch()
    console.log('--- Message Details ---')
    console.log(`Status: ${msg.status}`)
    console.log(`Error Code: ${msg.errorCode || 'None'}`)
    console.log(`Error Message: ${msg.errorMessage || 'None'}`)
    console.log(`To: ${msg.to}`)
    console.log(`From: ${msg.from}`)
    console.log('-----------------------')
    
    // Check if it's related to the 24-hour rule
    if (msg.errorCode === 63016) {
      console.log('💡 Tip: Error 63016 means you are outside the 24-hour window. You must use an approved WhatsApp Template, OR the user must message you first.')
    }
    // Check if it's related to Sandbox
    if (msg.errorCode === 63015) {
      console.log('💡 Tip: Error 63015 means the recipient has not joined the Twilio Sandbox. They must send the "join <keyword>" message to your Twilio number first.')
    }
  } catch (error) {
    console.error('Failed to fetch message details:', error)
  }
}

const sid = process.argv[2] || 'SM8459e3a5bd519718f26bb80dba008feb'
checkMessage(sid)
