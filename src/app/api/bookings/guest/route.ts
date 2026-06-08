import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Endpoint deprecated. Guest checkout is no longer supported natively.' }, { status: 404 })
}
