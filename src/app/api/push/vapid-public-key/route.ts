import { NextResponse } from 'next/server'
import { getVapidPublicKey, isPushConfigured } from '@/lib/push/vapid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!isPushConfigured() || !publicKey) {
    return NextResponse.json({ configured: false, publicKey: null })
  }
  return NextResponse.json({ configured: true, publicKey })
}
