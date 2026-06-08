/**
 * VAPID keys for Web Push (generate with: npx tsx scripts/generate-vapid-keys.ts)
 */

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
}

export function getVapidPrivateKey(): string | null {
  return process.env.VAPID_PRIVATE_KEY ?? null
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT ?? 'mailto:admin@flixcam.rent'
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey())
}
