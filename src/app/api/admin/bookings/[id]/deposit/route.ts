import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Endpoint deprecated in favor of /api/finance/deposits.' }, { status: 404 })
}
