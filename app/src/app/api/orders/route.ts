import { NextResponse } from 'next/server'
import { mockOrders } from '@/lib/utils/mock-data'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const status = searchParams.get('status')?.toLowerCase()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    let data = mockOrders
    if (search) {
      data = data.filter(
        (o) =>
          (o.orderNumber?.toLowerCase().includes(search) ?? false) ||
          (o.customer?.toLowerCase().includes(search) ?? false)
      )
    }
    if (status) {
      data = data.filter((o) => (o.status?.toLowerCase() ?? '') === status)
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paged = data.slice(start, end)

    return NextResponse.json({ data: paged, total, page, pageSize })
  } catch (error) {
    return handleApiError(error)
  }
}
