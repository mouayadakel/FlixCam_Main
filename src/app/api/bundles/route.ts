import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Endpoint deprecated in favor of kits. Use /api/kits.' }, { status: 404 })
}
