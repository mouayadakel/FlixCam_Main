/**
 * Wallet API – mapped to Payment model (credits = successful payments, debits = refunds).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { handleApiError } from '@/lib/utils/api-helpers'

interface WalletRow {
  id: string
  user: string
  type: 'credit' | 'debit'
  amount: number
  balance: number
  note?: string
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const allowed = await hasPermission(session.user.id, 'payment.read' as never)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payments = await prisma.payment.findMany({
      where: { deletedAt: null },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const rows: WalletRow[] = []
    for (const p of payments) {
      const amount = Number(p.amount)
      const refund = Number(p.refundAmount ?? 0)
      const customerName = p.booking?.customer?.name ?? p.booking?.customer?.email ?? p.bookingId
      if (p.status === 'SUCCESS' && amount > 0) {
        rows.push({
          id: p.id,
          user: customerName,
          type: 'credit',
          amount,
          balance: 0,
          note: `Booking ${p.booking?.bookingNumber}`,
          createdAt: p.createdAt.toISOString(),
        })
      }
      if (refund > 0) {
        rows.push({
          id: `${p.id}-refund`,
          user: customerName,
          type: 'debit',
          amount: refund,
          balance: 0,
          note: p.refundReason ?? `Refund – Booking ${p.booking?.bookingNumber}`,
          createdAt: p.updatedAt.toISOString(),
        })
      }
    }
    rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    let runningBalance = 0
    for (const r of rows) {
      runningBalance = r.type === 'credit' ? runningBalance + r.amount : runningBalance - r.amount
      r.balance = runningBalance
    }
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const type = searchParams.get('type')?.toLowerCase()
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    let data = rows
    if (search) {
      data = data.filter(
        (r) => r.user.toLowerCase().includes(search) || r.note?.toLowerCase().includes(search)
      )
    }
    if (type === 'credit' || type === 'debit') {
      data = data.filter((r) => r.type === type)
    }
    if (dateFrom) {
      data = data.filter((r) => new Date(r.createdAt) >= new Date(dateFrom))
    }
    if (dateTo) {
      data = data.filter((r) => new Date(r.createdAt) <= new Date(dateTo))
    }

    const total = data.length
    const start = (page - 1) * pageSize
    const paged = data.slice(start, start + pageSize)
    const totalCredits = data.filter((r) => r.type === 'credit').reduce((s, r) => s + r.amount, 0)
    const totalDebits = data.filter((r) => r.type === 'debit').reduce((s, r) => s + r.amount, 0)
    const totalBalance = totalCredits - totalDebits

    return NextResponse.json({
      data: paged,
      total,
      page,
      pageSize,
      summary: { totalBalance, totalCredits, totalDebits },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const allowed = await hasPermission(session.user.id, 'payment.create' as never)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Manual wallet entries are not supported. Use payments and refunds.' },
      { status: 400 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
