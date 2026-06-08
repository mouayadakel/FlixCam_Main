/**
 * Wallet API – ledger-backed running balance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowed = await hasPermission(session.user.id, 'payment.read' as never)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const entries = await prisma.ledgerEntry.findMany({
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      },
      payment: { select: { externalId: true, gateway: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  let runningBalance = 0
  const rows: WalletRow[] = entries.map((entry) => {
    const amount = Number(entry.amount)
    runningBalance =
      entry.type === 'CREDIT' ? runningBalance + amount : runningBalance - amount
    const customerName =
      entry.booking?.customer?.name ??
      entry.booking?.customer?.email ??
      entry.booking?.bookingNumber ??
      entry.reference ??
      entry.id

    return {
      id: entry.id,
      user: customerName,
      type: entry.type === 'CREDIT' ? 'credit' : 'debit',
      amount,
      balance: runningBalance,
      note: entry.description,
      createdAt: entry.createdAt.toISOString(),
    }
  })
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
}

export async function POST(request: NextRequest) {
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
}
