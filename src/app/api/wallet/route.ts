import { NextResponse } from 'next/server'
import { mockWalletTransactions } from '@/lib/utils/mock-data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() || ''
  const type = searchParams.get('type')?.toLowerCase()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

  let data = mockWalletTransactions
  if (search) {
    data = data.filter((tx) => tx.user.toLowerCase().includes(search) || tx.note?.toLowerCase().includes(search))
  }
  if (type) {
    data = data.filter((tx) => tx.type.toLowerCase() === type)
  }

  const total = data.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paged = data.slice(start, end)

  return NextResponse.json({ data: paged, total, page, pageSize })
}
