/**
 * Generate VAPID key pair for Web Push.
 * Run: npx tsx scripts/generate-vapid-keys.ts
 */
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('Add these to your .env (production) and redeploy:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`)
console.log(`VAPID_SUBJECT="mailto:admin@flixcam.rent"`)
