import { NextResponse } from 'next/server'
import { mockTechnicians } from '@/lib/utils/mock-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() || ''
  const status = searchParams.get('status')?.toLowerCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

  let data = mockTechnicians
  if (search) {
    data = data.filter((t) => t.name.toLowerCase().includes(search) || t.phone.toLowerCase().includes(search))
  }
  if (status) {
    data = data.filter((t) => t.status.toLowerCase() === status)
  }

  const total = data.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paged = data.slice(start, end)

  return NextResponse.json({ data: paged, total, page, pageSize })
}
